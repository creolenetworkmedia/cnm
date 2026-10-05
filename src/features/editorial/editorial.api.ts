import {api} from '../../shared/api'
import type {DraftRecord} from './editorial.model'
import type {DraftSnapshot} from '../../shared/contracts/forms'
export function listDrafts(){return api<{drafts:DraftRecord[]}>('draft.list')}
export function loadDraft(id:string){return api<DraftRecord>('draft.get',{id})}
export function saveDraft(payload:{id:string;expectedRevision:number;articleId:string|null;baseUpdatedAt:string|null;snapshot:DraftSnapshot},requestId:string){return api<DraftRecord>('draft.save',payload,requestId)}
export function publishDraft(draft:DraftRecord,requestId:string){return api<{articleId:string;updatedAt:string;publicRevision:number}>('draft.publish',{id:draft.id,expectedRevision:draft.revision,baseUpdatedAt:draft.baseUpdatedAt},requestId)}
export function unpublishArticle(id:string,updatedAt:string,requestId:string){return api<{ok:true}>('article.unpublish',{id,expectedUpdatedAt:updatedAt},requestId)}
export function deleteArticle(id:string,updatedAt:string,requestId:string){return api<{ok:true}>('article.delete',{id,expectedUpdatedAt:updatedAt},requestId)}
