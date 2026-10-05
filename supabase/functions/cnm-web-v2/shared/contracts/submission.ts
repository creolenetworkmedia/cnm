import {ValidationError,validateDraftSnapshot,SUBMISSION_NOTICE_VERSION,UUID,type DraftPhoto} from './forms.ts'
import {localeOrder,type Locale} from '../locale.ts'
import type {VideoRef} from '../media/video.ts'
export {SUBMISSION_NOTICE_VERSION}
export type StorySubmission={name:string;title:string;body:string;locale:Locale;scopeId:string;photos:DraftPhoto[];video:VideoRef|null;rightsConfirmed:true;policyVersion:string}
export function validateSubmission(raw:unknown):StorySubmission{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ValidationError('invalid_request');const p=raw as Record<string,unknown>
 if(Object.keys(p).some(k=>!['name','title','body','locale','scopeId','photos','video','rightsConfirmed','policyVersion'].includes(k)))throw new ValidationError('invalid_field')
 if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>80)throw new ValidationError('required','name')
 if(!localeOrder.includes(p.locale as Locale)||!UUID.test(String(p.scopeId))||p.rightsConfirmed!==true||p.policyVersion!==SUBMISSION_NOTICE_VERSION)throw new ValidationError('invalid_request')
 const language=p.locale as Locale
 const s=validateDraftSnapshot({slug:'',category_id:null,author_credit:p.name,title_i18n:{[language]:p.title},excerpt_i18n:{},body_i18n:{[language]:p.body},photos:p.photos||[],video:p.video||null,is_sponsored:false,sponsor_credit:''})
 if(!s.title_i18n[language]||!s.body_i18n[language])throw new ValidationError('required','title')
 if(s.photos.some(photo=>!photo.uploadId))throw new ValidationError('invalid_photo')
 return {name:p.name.trim(),title:s.title_i18n[language]!,body:s.body_i18n[language]!,locale:language,scopeId:String(p.scopeId),photos:s.photos,video:s.video,rightsConfirmed:true,policyVersion:SUBMISSION_NOTICE_VERSION}
}
