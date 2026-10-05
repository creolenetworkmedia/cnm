import {describe,it,expect} from 'vitest'
import {policyDocuments,getPublicPolicy} from '../../src/policies/manifest'
import {safeSupportUrl} from '../../src/features/operations/SupportPage'
describe('policy and support safety',()=>{
 it('keeps legal drafts visibly unapproved, with matching sections in all languages',()=>{
  for(const kind of ['terms','privacy','editorial'] as const){const docs=policyDocuments[kind];const keys=docs.en.sections.map(s=>s.id);for(const locale of ['en','fr','ht','es'] as const){expect(docs[locale].sections.map(s=>s.id)).toEqual(keys);expect(docs[locale].status).toBe('draft');expect(getPublicPolicy(kind,locale)).toBeNull()}}
 })
 it('does not loop support or accept unsafe payment links',()=>{expect(safeSupportUrl('https://creolenetworkmedia.com/support')).toBeNull();expect(safeSupportUrl('javascript:alert(1)')).toBeNull();expect(safeSupportUrl('https://payments.example.org/cnm')).toBe('https://payments.example.org/cnm')})
})
