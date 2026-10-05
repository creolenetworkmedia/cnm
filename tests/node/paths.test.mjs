import {test} from 'node:test'; import assert from 'node:assert/strict';
// These contracts also run in Vitest once the CI-resolved workspace arrives.
let paths;try { paths=await import('../../src/app/paths.ts') }catch { paths={} }
test('a Pages route gets exactly one base prefix',()=>{assert.equal(typeof paths.toSitePath,'function');assert.equal(paths.toSitePath('/news/a','/cnm/'),'/cnm/news/a')})
test('direct nested URLs have a parsed article slug',()=>{assert.equal(typeof paths.parseSitePath,'function');assert.deepEqual(paths.parseSitePath('/cnm/news/a','/cnm/'),{page:'article',slug:'a'})})
test('bad route prefixes and percent encodings fail closed',()=>{assert.equal(typeof paths.parseSitePath,'function');assert.equal(paths.parseSitePath('/cnmother/news','/cnm/').page,'not-found');assert.equal(paths.parseSitePath('/cnm/news/%E0%A4%A','/cnm/').page,'not-found')})
