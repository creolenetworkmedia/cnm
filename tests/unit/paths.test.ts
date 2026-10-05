import { describe, expect, it } from 'vitest'
import { toSitePath, parseSitePath } from '../../src/app/paths'
describe('deployment paths', () => {
  it('prefixes every Pages route once', () => {
    expect(toSitePath('/news/a-story', '/cnm/')).toBe('/cnm/news/a-story')
    expect(toSitePath('/', '/cnm/')).toBe('/cnm/')
    expect(toSitePath('/news/a-story', '/')).toBe('/news/a-story')
  })
  it('recognizes a nested direct route on both targets', () => {
    expect(parseSitePath('/cnm/news/a-story/', '/cnm/')).toEqual({page:'article',slug:'a-story'})
    expect(parseSitePath('/news/a-story', '/')).toEqual({page:'article',slug:'a-story'})
  })
  it('does not confuse a similarly named path or malformed encoding', () => {
    expect(parseSitePath('/cnmother/news', '/cnm/').page).toBe('not-found')
    expect(parseSitePath('/cnm/news/%E0%A4%A', '/cnm/').page).toBe('not-found')
    expect(parseSitePath('/cnm/news/a%2Fb', '/cnm/').page).toBe('not-found')
    expect(parseSitePath('/cnm/unknown', '/cnm/').page).toBe('not-found')
  })
  it('includes the approved public destinations', () => {
    for (const page of ['contact','sponsor','submit-story','terms','privacy','editorial-policy','watch'])
      expect(parseSitePath(`/cnm/${page}`, '/cnm/').page).toBe(page)
  })
})
