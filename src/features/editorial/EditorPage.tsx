import {useEffect,useState} from 'react'
import {getAdminArticles,getCategories,type ArticleCategory} from '../../data'
import type {PublicArticle} from '../articles/article.model'
import {useLocale} from '../../shared/i18n'
import {useAuth} from '../account/AuthProvider'
import {SiteLink} from '../../app/router'
import {Brand} from '../../design/Brand'
import {errorKey} from '../../shared/api'
import {DraftEditor} from './DraftEditor'
import {Inbox} from './Inbox'
import {StationSettings} from './StationSettings'
import {listDrafts,loadDraft,unpublishArticle,deleteArticle} from './editorial.api'
import type {DraftRecord} from './editorial.model'
export function EditorPage({onPublished}:{onPublished:()=>void}){
 const auth=useAuth(),{t,locale}=useLocale(),[tab,setTab]=useState<'published'|'drafts'|'inquiry'|'submission'|'station'>('published'),[articles,setArticles]=useState<PublicArticle[]>([]),[drafts,setDrafts]=useState<DraftRecord[]>([]),[categories,setCategories]=useState<ArticleCategory[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[editor,setEditor]=useState<{key:string;article:PublicArticle|null;draft:DraftRecord|null}|null>(null),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false)
 const reload=()=>setAttempt(n=>n+1)
 useEffect(()=>{let active=true;if(!auth.isAdmin){setEditor(null);setDrafts([]);setArticles([]);return}setLoading(true);setError('');Promise.all([getAdminArticles(),getCategories(),listDrafts().catch(()=>({drafts:[]}))]).then(([a,c,d])=>{if(active){setArticles(a as PublicArticle[]);setCategories(c);setDrafts(d.drafts)}}).catch(e=>{if(active)setError(errorKey(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[auth.isAdmin,auth.session?.user.id,attempt])
 if(auth.loading)return <div className="container standard-page" role="status">{t('loading')}{'\u2026'}</div>
 if(!auth.session)return <div className="container standard-page editorial-guard"><Brand/><h1>{t('signInRequired')}</h1><p>{t('editorialBody')}</p><SiteLink to="/account" className="button">{t('signIn')}</SiteLink></div>
 if(!auth.isAdmin)return <div className="container standard-page editorial-guard"><Brand/><h1>{t('adminOnly')}</h1><p>{t('notAdmin')}</p><SiteLink to="/account">{t('account')}</SiteLink></div>
 const changed=()=>{setEditor(null);reload();onPublished()}
 if(editor)return <DraftEditor key={editor.key} article={editor.article} initial={editor.draft} categories={categories} onClose={()=>{setEditor(null);reload()}} onPublished={changed}/>
 const openDraft=async(id:string)=>{setError('');try{const draft=await loadDraft(id);setEditor({key:id,article:articles.find(a=>a.id===draft.articleId)||null,draft})}catch(e){setError(errorKey(e))}}
 const act=async(article:PublicArticle,remove:boolean)=>{if(busy||!window.confirm(t(remove?'deleteConfirm':'unpublishConfirm')))return;setBusy(true);setError('');try{await (remove?deleteArticle:unpublishArticle)(article.id,article.updated_at,crypto.randomUUID());changed()}catch(e){setError(errorKey(e))}finally{setBusy(false)}}
 return <div className="container standard-page editorial-page"><header className="editorial-top"><div><span className="eyebrow">CNM</span><h1>{t('editorialTitle')}</h1></div><button type="button" className="button" onClick={()=>setEditor({key:crypto.randomUUID(),article:null,draft:null})}>+ {t('newArticle')}</button></header><div className="editorial-tabs" role="tablist" aria-label={t('admin')}>{(['published','drafts','inquiry','submission','station'] as const).map(key=><button type="button" role="tab" aria-selected={tab===key} key={key} onClick={()=>setTab(key)}>{t(key==='inquiry'?'inquiries':key==='submission'?'queue':key==='station'?'streamSettings':key)}</button>)}</div>{error&&<p role="alert" className="field-error">{t(error)}</p>}
 {tab==='published'&&<div>{loading&&<p role="status">{t('loading')}{'\u2026'}</p>}{!loading&&!articles.length&&<p>{t('noStories')}</p>}<div className="editorial-list">{articles.map(a=><div className="editorial-row" key={a.id}><button type="button" className="editorial-select" onClick={()=>setEditor({key:a.id,article:a,draft:null})}><strong>{a.title_i18n[locale]||a.title_i18n.en||a.title_i18n.fr||a.slug}</strong><small>{t(a.status)}</small></button><div className="editorial-row-actions">{a.status==='published'&&<><SiteLink to={'/news/'+encodeURIComponent(a.slug)}>{t('openStory')}</SiteLink><button type="button" disabled={busy} onClick={()=>act(a,false)}>{t('unpublish')}</button></>}<button type="button" className="danger-text" disabled={busy} onClick={()=>act(a,true)}>{t('delete')}</button></div></div>)}</div></div>}
 {tab==='drafts'&&<div><p className="field-help">{t('uploadPrivate')}</p>{!loading&&!drafts.length&&<p>{t('noDrafts')}</p>}<div className="editorial-list">{drafts.map(d=><button type="button" key={d.id} onClick={()=>openDraft(d.id)}><strong>{d.snapshot.title_i18n[locale]||d.snapshot.title_i18n.en||d.snapshot.slug||t('untitled')}</strong><span>{t('privateDraft')}</span></button>)}</div></div>}
 {tab==='inquiry'&&<Inbox kind="inquiry"/>}{tab==='submission'&&<Inbox kind="submission"/>}{tab==='station'&&<StationSettings onSaved={onPublished}/>}</div>
}
