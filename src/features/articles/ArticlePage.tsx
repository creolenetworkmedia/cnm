import {useEffect,useState} from 'react'
import {useLocale,selectArticleLocale,localeNames,type Locale} from '../../shared/i18n'
import {loadArticle} from './article.queries'
import {dateLabel,type PublicArticle} from './article.model'
import {SiteLink} from '../../app/router'
import {VideoEmbed} from '../media/VideoEmbed'
import {ResponsivePhoto} from '../media/ResponsivePhoto'
import {useRadio} from '../radio/RadioProvider'
import {Icon} from '../../design/Icon'
export function ArticlePage({slug}:{slug:string}){
 const {locale,t}=useLocale(),{lowData}=useRadio(),[article,setArticle]=useState<PublicArticle|null>(null),[status,setStatus]=useState<'loading'|'loaded'|'error'>('loading'),[retry,setRetry]=useState(0),[chosen,setChosen]=useState<Locale|null>(null)
 useEffect(()=>{const controller=new AbortController();let active=true;setArticle(null);setStatus('loading');setChosen(null);const timeout=setTimeout(()=>controller.abort(),15000);loadArticle(slug,controller.signal).then(a=>{if(active){setArticle(a);setStatus('loaded')}}).catch(()=>{if(active)setStatus('error')}).finally(()=>clearTimeout(timeout));return()=>{active=false;clearTimeout(timeout);controller.abort()}},[slug,retry])
 if(status==='loading')return <div className="container standard-page" role="status">{t('loading')}{'\u2026'}</div>
 if(status==='error')return <div className="container standard-page"><p role="alert">{t('loadError')}</p><button className="button" onClick={()=>setRetry(r=>r+1)}>{t('retry')}</button></div>
 if(!article)return <div className="container standard-page"><h1>{t('notFound')}</h1><SiteLink to="/news">{t('backToNews')}</SiteLink></div>
 return <ArticleReader article={article} locale={chosen||locale} requestedLocale={locale} onLanguage={setChosen} lowData={lowData}/>
}
export function ArticleReader({article,locale,requestedLocale,onLanguage,lowData=false}:{article:PublicArticle;locale:Locale;requestedLocale?:Locale;onLanguage?:(locale:Locale)=>void;lowData?:boolean}){
 const {t}=useLocale(),a=selectArticleLocale(article,locale)
 return <article className="article-page"><header className="article-heading container"><SiteLink to="/news" className="back-link"><Icon name="back" size={17}/>{t('backToNews')}</SiteLink><div className="eyebrow">{article.is_sponsored?t('advertising'):'CNM'}</div><h1 lang={a.shownLocale}>{a.title}</h1>{a.summary&&<p className="article-summary" lang={a.shownLocale}>{a.summary}</p>}<div className="article-byline">{article.author_credit&&<strong>{article.author_credit}</strong>}<time dateTime={article.published_at||undefined}>{dateLabel(article.published_at,locale)}</time>{article.updated_at!==article.published_at&&article.published_at&&<span>{t('updated')} {dateLabel(article.updated_at,locale)}</span>}</div>{a.shownLocale!==(requestedLocale||locale)&&<p className="translation-notice">{t('translationNote')} <strong>{localeNames[a.shownLocale]}</strong>.</p>}{a.availableLocales.length>1&&<div className="article-language-list" aria-label={t('availableIn')}>{a.availableLocales.map(l=><button key={l} type="button" aria-pressed={l===a.shownLocale} onClick={()=>onLanguage?.(l)}>{localeNames[l]}</button>)}</div>}</header>
 {article.hero&&<div className="container article-cover"><ResponsivePhoto asset={article.hero} alt={article.hero.alt_i18n?.[a.shownLocale]||a.title} caption={article.hero.caption_i18n?.[a.shownLocale]} credit={article.hero.credit} priority lowData={lowData}/></div>}
 <div className="reading-column" lang={a.shownLocale}>{a.body.split(/\n{2,}/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div>
 {!!article.gallery?.length&&<div className="container article-gallery">{article.gallery.map(photo=><ResponsivePhoto key={photo.id} asset={photo} alt={photo.alt_i18n?.[a.shownLocale]||a.title} caption={photo.caption_i18n?.[a.shownLocale]} credit={photo.credit} lowData={lowData}/>)}</div>}
 {article.video&&<div className="reading-column video-column"><VideoEmbed key={article.video.videoId} video={article.video} label={a.title}/></div>}
 <div className="reading-column article-end"><SiteLink to={'/contact?category=correction&article='+encodeURIComponent(article.slug)}>{t('correctionLink')}</SiteLink><SiteLink to="/news">{t('related')}<Icon name="arrow" size={18}/></SiteLink></div></article>
}
