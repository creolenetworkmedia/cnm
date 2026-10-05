import {SiteLink} from '../../app/router'
import {useLocale} from '../../shared/i18n'
import {localized} from '../../i18n'
import {ResponsivePhoto} from '../media/ResponsivePhoto'
import {storyLabel,dateLabel,type PublicArticle} from './article.model'
export function ArticleCard({article,lead=false,compact=false}:{article:PublicArticle;lead?:boolean;compact?:boolean}){
 const {locale,t}=useLocale(),label=storyLabel(article,locale),path='/news/'+encodeURIComponent(article.slug)
 return <article className={['story',lead?'story-lead':'',compact?'story-compact':''].join(' ')}>
 {article.hero&&!compact&&<SiteLink to={path} className="story-image-link" tabIndex={-1} aria-hidden="true"><ResponsivePhoto asset={article.hero} alt="" priority={lead}/></SiteLink>}
 <div className="story-copy"><div className="story-category">{article.is_sponsored?t('advertising'):localized(article.category?.name_i18n,locale)||t('news')}</div><h2 lang={label.locale}><SiteLink to={path}>{label.title}</SiteLink></h2>{!compact&&label.summary&&<p lang={label.locale}>{label.summary}</p>}<div className="story-meta">{article.author_credit&&<span>{article.author_credit}</span>}<time dateTime={article.published_at||undefined}>{dateLabel(article.published_at,locale)}</time></div></div>
 </article>
}
