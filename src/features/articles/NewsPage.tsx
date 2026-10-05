import {useState} from 'react'
import {useLocale} from '../../shared/i18n'
import {SiteLink} from '../../app/router'
import {ArticleCard} from './ArticleCard'
import type {PublicArticle} from './article.model'
import {localized} from '../../i18n'
export function NewsPage({articles,loading=false,error=false,onRetry=()=>{},watch=false}:{articles:PublicArticle[];loading?:boolean;error?:boolean;onRetry?:()=>void;watch?:boolean}){
 const {t,locale}=useLocale(),[category,setCategory]=useState('all'),available=watch?articles.filter(a=>a.video):articles
 const categories=[...new Map(available.filter(a=>a.category).map(a=>[a.category!.id,a.category!])).values()],visible=category==='all'?available:available.filter(a=>a.category_id===category)
 return <div className="container standard-page"><header className="page-heading"><span className="eyebrow">CREOLE NETWORK MEDIA</span><h1>{t(watch?'watch':'news')}</h1></header>{error&&<div role="alert" className="notice error">{t('loadError')} <button onClick={onRetry}>{t('retry')}</button></div>}{categories.length>0&&<nav className="category-tabs" aria-label={t('category')}><button aria-pressed={category==='all'} onClick={()=>setCategory('all')}>{t('all')}</button>{categories.map(c=><button key={c.id} onClick={()=>setCategory(c.id)} aria-pressed={category===c.id}>{localized(c.name_i18n,locale)}</button>)}</nav>}{loading?<p className="loading-state" role="status">{t('loading')}{'\u2026'}</p>:visible.length?<div className="news-grid">{visible.map(a=><ArticleCard key={a.id} article={a}/>)}</div>:<section className="empty-editorial"><p>{t(watch?'watchEmpty':'newsEmpty')}</p><SiteLink to="/submit-story" className="text-link">{t('submitArticle')} {'\u2192'}</SiteLink></section>}</div>
}
