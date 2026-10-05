import {describe,it,expect} from 'vitest'
import {emptySnapshot,articleToSnapshot,buildSaveInput,isDraftDirty,photoInputError} from '../../src/features/editorial/editorial.model'
import {SUBMISSION_NOTICE_VERSION,validateSubmission} from '../../src/shared/contracts/submission'
const id='18cbf0ca-39ed-4a6a-85a7-ccfce2979eac'
describe('editorial draft contract',()=>{
 it('keeps a published snapshot unchanged when a local draft is edited',()=>{const article:any={id,slug:'hello',title_i18n:{en:'Hello'},excerpt_i18n:{},body_i18n:{en:'Body'},published_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z',status:'published'};const value=articleToSnapshot(article);value.title_i18n.en='Changed';expect(article.title_i18n.en).toBe('Hello');const input=buildSaveInput(id,0,article,value);expect(input.baseUpdatedAt).toBe(article.updated_at);expect(input.snapshot.title_i18n.en).toBe('Changed');expect(input).not.toHaveProperty('status');expect(input).not.toHaveProperty('actor');});
 it('detects changed translations but ignores object key ordering',()=>{const a=emptySnapshot();expect(isDraftDirty(a,{...a})).toBe(false);expect(isDraftDirty(a,{...a,title_i18n:{fr:'Bonjour'}})).toBe(true);});
 it('rejects oversized and unsupported files and caps the gallery',()=>{expect(photoInputError({size:10485761,type:'image/jpeg'},0)).toBe('imageTooLarge');expect(photoInputError({size:500,type:'image/svg+xml'},0)).toBe('imageUnsupported');expect(photoInputError({size:500,type:'image/jpeg'},11)).toBe('photoLimit');expect(photoInputError({size:500,type:'image/jpeg'},10)).toBe(null);});
})
describe('reader submission contract',()=>{
 const valid={name:'A reader',title:'A story',body:'Article text',locale:'ht',photos:[],video:null,rightsConfirmed:true,policyVersion:SUBMISSION_NOTICE_VERSION,scopeId:id};
 it('requires permission to review and rejects spoofed publication status',()=>{expect(validateSubmission(valid).locale).toBe('ht');expect(()=>validateSubmission({...valid,rightsConfirmed:false})).toThrow();expect(()=>validateSubmission({...valid,status:'published'})).toThrow();});
 it('requires attachments to be private uploads, not another public asset',()=>{expect(()=>validateSubmission({...valid,photos:[{mediaId:id,caption:{},alt:{},credit:''}]})).toThrow();});
})
