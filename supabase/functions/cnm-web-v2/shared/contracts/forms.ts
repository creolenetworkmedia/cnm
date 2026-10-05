import {localeOrder,type Locale} from '../locale.ts'
import {isVideoRef,type VideoRef} from '../media/video.ts'
export const CONTACT_NOTICE_VERSION='contact-notice-2026-10-05'
export const SUBMISSION_NOTICE_VERSION='submission-review-2026-10-05'
export const categories=['general','technical','sponsorship','editorial','correction','copyright'] as const
export type InquiryCategory=typeof categories[number]
export class ValidationError extends Error{code:string;field:string;constructor(code:string,field=''){super(code);this.name='ValidationError';this.code=code;this.field=field}}
function object(raw:unknown):Record<string,unknown>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ValidationError('invalid_request');return raw as Record<string,unknown>}
function keys(raw:Record<string,unknown>,allowed:string[]){if(Object.keys(raw).some(k=>!allowed.includes(k)))throw new ValidationError('invalid_field')}
function str(raw:unknown,max:number,required=false,field=''):string{if(raw===undefined||raw===null){if(required)throw new ValidationError('required',field);return ''}if(typeof raw!=='string'||raw.trim().length>max)throw new ValidationError('too_long',field);const v=raw.trim();if(required&&!v)throw new ValidationError('required',field);return v}
function locale(raw:unknown):Locale{if(typeof raw!=='string'||!localeOrder.includes(raw as Locale))throw new ValidationError('invalid_locale');return raw as Locale}
function refUrl(raw:unknown):string{const v=str(raw,2048);if(!v)return '';try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw 0;return u.href}catch{throw new ValidationError('invalid_url','relevantUrl')}}
export type InquiryInput={name:string;email:string;category:InquiryCategory;message:string;locale:Locale;policyVersion:string;relevantUrl?:string;organization?:string;interest?:'radio'|'website'|'community';budgetRange?:string}
export function validateInquiry(raw:unknown):InquiryInput{
 const p=object(raw);keys(p,['name','email','category','message','locale','policyVersion','relevantUrl','organization','interest','budgetRange'])
 const email=str(p.email,254,true,'email');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ValidationError('invalid_email','email')
 if(!categories.includes(p.category as InquiryCategory))throw new ValidationError('invalid_category')
 if(p.policyVersion!==CONTACT_NOTICE_VERSION)throw new ValidationError('invalid_policy')
 const result:InquiryInput={name:str(p.name,80,true,'name'),email,category:p.category as InquiryCategory,message:str(p.message,5000,true,'message'),locale:locale(p.locale),policyVersion:CONTACT_NOTICE_VERSION,relevantUrl:refUrl(p.relevantUrl)}
 if(result.category==='sponsorship'){result.organization=str(p.organization,160,true,'organization');if(!['radio','website','community'].includes(String(p.interest)))throw new ValidationError('invalid_interest','interest');result.interest=p.interest as InquiryInput['interest'];result.budgetRange=str(p.budgetRange,80,false,'budgetRange')}
 return result
}
export type LocalizedText=Partial<Record<Locale,string>>
export type DraftPhoto={uploadId?:string;mediaId?:string;caption:LocalizedText;alt:LocalizedText;credit:string}
export type DraftSnapshot={slug:string;category_id:string|null;author_credit:string;title_i18n:LocalizedText;excerpt_i18n:LocalizedText;body_i18n:LocalizedText;photos:DraftPhoto[];video:VideoRef|null;is_sponsored:boolean;sponsor_credit:string}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function textMap(raw:unknown,max:number):LocalizedText{if(raw==null)return {};const p=object(raw);keys(p,[...localeOrder]);return Object.fromEntries(Object.entries(p).map(([k,v])=>[k,str(v,max)]))}
export function validateDraftSnapshot(raw:unknown):DraftSnapshot{
 const p=object(raw);keys(p,['slug','category_id','author_credit','title_i18n','excerpt_i18n','body_i18n','photos','video','is_sponsored','sponsor_credit'])
 const slug=str(p.slug,120);if(slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ValidationError('invalid_slug')
 const category=str(p.category_id,36);if(category&&!UUID.test(category))throw new ValidationError('invalid_category')
 const photos=p.photos??[];if(!Array.isArray(photos)||photos.length>11)throw new ValidationError('photo_limit')
 const normalizedPhotos=photos.map(rawPhoto=>{const photo=object(rawPhoto);keys(photo,['uploadId','mediaId','caption','alt','credit']);const uploadId=str(photo.uploadId,36),mediaId=str(photo.mediaId,36);if((!uploadId&&!mediaId)||(uploadId&&mediaId)||!UUID.test(uploadId||mediaId))throw new ValidationError('invalid_photo');return {...(uploadId?{uploadId}:{mediaId}),caption:textMap(photo.caption,1000),alt:textMap(photo.alt,500),credit:str(photo.credit,160)}})
 if(p.video!=null&&!isVideoRef(p.video))throw new ValidationError('invalid_video')
 return {slug,category_id:category||null,author_credit:str(p.author_credit,160),title_i18n:textMap(p.title_i18n,250),excerpt_i18n:textMap(p.excerpt_i18n,1500),body_i18n:textMap(p.body_i18n,50000),photos:normalizedPhotos,video:p.video as VideoRef|null||null,is_sponsored:p.is_sponsored===true,sponsor_credit:str(p.sponsor_credit,160)}
}
export function canPublish(snapshot:DraftSnapshot):boolean{return Boolean(snapshot.slug&&snapshot.author_credit&&localeOrder.some(l=>snapshot.title_i18n[l]?.trim()&&snapshot.body_i18n[l]?.trim())&&(!snapshot.is_sponsored||snapshot.sponsor_credit))}
