import {policyRows} from './content'
import {localeOrder,type Locale} from '../shared/locale'
export type PolicyKind='terms'|'privacy'|'editorial'
export type PolicyDocument={kind:PolicyKind;version:string;locale:Locale;status:'draft'|'approved';effectiveDate:string|null;sections:{id:string;heading:string;body:string}[]}
export const policyDocuments=Object.fromEntries((['terms','privacy','editorial'] as const).map(kind=>[kind,Object.fromEntries(localeOrder.map((locale,i)=>[locale,{kind,version:'2026-10-05-review',locale,status:'draft',effectiveDate:null,sections:policyRows[kind].map(row=>({id:row.id,heading:row.heading[i],body:row.body[i]}))}]))])) as Record<PolicyKind,Record<Locale,PolicyDocument>>
export function getPublicPolicy(kind:PolicyKind,locale:Locale):PolicyDocument|null{const doc=policyDocuments[kind][locale];return doc.status==='approved'?doc:null}
