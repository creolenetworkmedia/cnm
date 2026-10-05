import {describe,it,expect} from 'vitest'
import {normalizeLocale, selectArticleLocale, dictionaries} from '../../src/shared/i18n'
describe('language integrity',()=>{
 it('handles invalid saved languages',()=>{
  for(const value of [null,undefined,'bad','__proto__',{},'']) expect(normalizeLocale(value)).toBe('en')
  expect(normalizeLocale('ht')).toBe('ht')
 })
 it('covers every interface key in all four languages',()=>{
  const keys=Object.keys(dictionaries.en).sort()
  for(const l of ['fr','ht','es'] as const){
   expect(Object.keys(dictionaries[l]).sort()).toEqual(keys)
   for(const k of keys) expect(dictionaries[l][k].trim().length).toBeGreaterThan(0)
  }
 })
 it('does not mislabel or combine untranslated article content',()=>{
  const a={title_i18n:{fr:'Titre',en:'Incomplete'},excerpt_i18n:{fr:'Resume'},body_i18n:{fr:'Texte'},content_blocks_i18n:{}}
  const r=selectArticleLocale(a,'ht')
  expect(r.shownLocale).toBe('fr');expect(r.missingTranslation).toBe(true)
  expect(r.availableLocales).toEqual(['fr']);expect(r.title).toBe('Titre');expect(r.body).toBe('Texte')
 })
})
