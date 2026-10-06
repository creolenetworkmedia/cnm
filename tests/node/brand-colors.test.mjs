import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const tokens = readFileSync(new URL('../../src/design/tokens.css', import.meta.url), 'utf8');
const value = name => tokens.match(new RegExp('--' + name + ':\\s*(#[0-9a-f]+)', 'i'))?.[1].toLowerCase();
test('CNM uses solid primary blue, white, and red without tinted page surfaces', () => {
  assert.equal(value('blue'), '#0000ff');
  assert.equal(value('red'), '#e60000');
  assert.equal(value('paper'), '#ffffff');
  assert.equal(value('wash'), '#ffffff');
  assert.equal(value('ink'), '#000000');
});
function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(h => parseInt(h, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels.reduce((sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index], 0);
}
test('both brand colors support readable small white text', () => {
  for (const name of ['blue', 'red']) assert.ok(1.05 / (luminance(value(name)) + 0.05) >= 4.5, name + ' must pass 4.5:1 against white');
});
