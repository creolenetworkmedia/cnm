import {describe,it,expect} from 'vitest'
import {validateInquiry,validateDraftSnapshot,CONTACT_NOTICE_VERSION} from '../../src/shared/contracts/forms'
const inquiry={name:'Test',email:'test@example.com',category:'general',message:'A question for CNM',locale:'en',policyVersion:CONTACT_NOTICE_VERSION}
describe('trusted request validation',()=>{
 it('accepts a bounded inquiry and rejects forged private fields',()=>{expect(validateInquiry(inquiry).name).toBe('Test');expect(()=>validateInquiry({...inquiry,status:'agreed'})).toThrow();expect(()=>validateInquiry({...inquiry,actor:'forged'})).toThrow()})
 it('rejects whitespace, overlong text and invalid references',()=>{for(const invalid of [{name:' '},{email:'invalid'},{message:'a'.repeat(5001)},{relevantUrl:'javascript:alert(1)'},{policyVersion:'forged'}])expect(()=>validateInquiry({...inquiry,...invalid})).toThrow()})
 it('requires an organization and supported interest for sponsorship',()=>{expect(()=>validateInquiry({...inquiry,category:'sponsorship'})).toThrow();expect(validateInquiry({...inquiry,category:'sponsorship',organization:'Studio',interest:'radio'}).interest).toBe('radio')})
 it('rejects invalid videos and excess article photos',()=>{expect(()=>validateDraftSnapshot({title_i18n:{en:'Test'},body_i18n:{en:'Body'},video:{provider:'x',videoId:'bad'}})).toThrow();expect(()=>validateDraftSnapshot({photos:Array.from({length:12},()=>({uploadId:crypto.randomUUID()}))})).toThrow()})
})
