import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

test('production Pages deploy builds for the custom-domain root', () => {
  const workflow = readFileSync('.github/workflows/deploy-pages.yml','utf8')
  assert.match(workflow,/CNM_DEPLOY_TARGET:\s*domain/)
})
