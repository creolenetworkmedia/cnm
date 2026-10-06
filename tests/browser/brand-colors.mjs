import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base = (process.env.CNM_SMOKE_URL || 'http://127.0.0.1:4173/cnm/').replace(/\/?$/, '/');
const out = process.env.CNM_VISUAL_DIR || 'visual';
const expected = {blue: '#0000ff', red: '#e60000', paper: '#ffffff', ink: '#000000'};
const failures = [], results = [];
const browser = await chromium.launch({headless: true});
await mkdir(out, {recursive: true});
function check(actual, wanted, name) {try {assert.equal(actual, wanted, name);} catch (error) {failures.push(error.message);}}
try {
  for (const [label, width, height] of [['desktop', 1440, 1100], ['mobile', 390, 844]]) {
    const context = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, isMobile: label === 'mobile', hasTouch: label === 'mobile'});
    const page = await context.newPage();
    page.on('pageerror', error => failures.push(String(error)));
    if (process.env.CNM_EXPECTED_COMMIT) {
      const infoUrl = new URL('build-info.json', base); infoUrl.searchParams.set('check', Date.now());
      const info = await context.request.get(infoUrl.href);
      assert.ok(info.ok(), 'Deployed build metadata must load');
      check((await info.json()).commit, process.env.CNM_EXPECTED_COMMIT, 'The deployed commit must match this release');
    }
    for (const route of ['', 'listen/', 'sponsor/']) {
      const url = new URL(route, base); url.searchParams.set('color-check', Date.now());
      const response = await page.goto(url.href, {waitUntil: 'domcontentloaded'});
      assert.ok(response?.ok(), `The ${route || 'home'} document must load`);
      await page.locator('[data-cnm-design="editorial-v2"]').waitFor();
      await page.locator('header').waitFor();
      if (!route) await page.locator('.front-page[aria-busy="false"]').waitFor({timeout: 20000});
      if (route === 'listen/') await page.locator('.listen-page').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.querySelectorAll('img.cnm-brand')].every(image => image.complete && image.naturalWidth > 0));
      const state = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const paint = selector => {const e = document.querySelector(selector); return e ? {background: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color} : null;};
        return {
          tokens: Object.fromEntries(['blue', 'red', 'paper', 'ink'].map(key => [key, style.getPropertyValue('--' + key).trim().toLowerCase()])),
          body: paint('body'), radio: paint('.radio-strip'), footer: paint('.site-footer'), mark: paint('.station-feature-mark'), programs: paint('.program-feature'), listen: paint('.listen-page'),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      for (const [key, value] of Object.entries(expected)) check(state.tokens[key], value, `${label}/${route} ${key}`);
      check(state.body.background, 'rgb(255, 255, 255)', `${label}/${route} white page`);
      check(state.overflow, false, `${label}/${route} no page overflow`);
      for (const part of ['radio', 'footer', 'listen']) {
        if (!state[part]) continue;
        check(state[part].background, 'rgb(0, 0, 255)', `${label}/${route} ${part} blue`);
        check(state[part].color, 'rgb(255, 255, 255)', `${label}/${route} ${part} white type`);
      }
      for (const part of ['mark', 'programs']) if (state[part]) check(state[part].background, 'rgb(255, 255, 255)', `${label}/${route} ${part} white`);
      results.push({label, route: route || 'home', ...state});
      await page.screenshot({path: `${out}/cnm-${label}-${route.replace('/', '') || 'home'}.png`, fullPage: true});
    }
    await context.close();
  }
} finally {await browser.close();}
await writeFile(`${out}/brand-color-results.json`, JSON.stringify({base, results, failures}, null, 2));
assert.equal(failures.length, 0, failures.join('\n'));
console.log(`PASS: solid CNM colors and page widths across ${results.length} desktop/mobile views.`);
