import {useState} from 'react'
import {SiteLink,useRouter} from '../../app/router'
import {Brand} from '../../design/Brand'
import {Icon} from '../../design/Icon'
import {Dialog} from '../../design/Dialog'
import {useLocale} from '../../shared/i18n'
import {LanguageMenu} from './LanguageMenu'
const links=[['/news','news'],['/listen','listen'],['/programs','programs'],['/watch','watch'],['/community','community']] as const
export function SiteHeader({isAdmin=false,signedIn=false}:{isAdmin?:boolean;signedIn?:boolean}){
 const {t}=useLocale(),{route}=useRouter(),[open,setOpen]=useState(false)
 return <><a className="skip-link" href="#main-content">{t('skipContent')}</a><header className="masthead"><div className="masthead-top container"><SiteLink to="/" className="masthead-brand" aria-label={t('home')}><Brand/><span className="masthead-name">CREOLE<br/>NETWORK MEDIA</span></SiteLink><div className="masthead-right"><SiteLink className="utility-link" to="/sponsor">{t('partner')}</SiteLink><LanguageMenu/><SiteLink to="/account" className="account-link" aria-label={t('account')}><Icon name="user" size={19}/><span>{signedIn?t('account'):t('signIn')}</span></SiteLink><button type="button" className="icon-button mobile-menu-button" aria-label={t('menu')} onClick={()=>setOpen(true)}><Icon name="menu"/></button></div></div>
 <div className="nav-rule"><div className="container nav-inner"><nav className="primary-nav" aria-label={t('menu')}>{links.map(([to,label])=><SiteLink key={to} to={to} aria-current={('/'+route.page===to||(route.page==='article'&&to==='/news'))?'page':undefined}>{t(label)}</SiteLink>)}</nav><nav className="secondary-nav" aria-label={t('about')}><SiteLink to="/about">{t('about')}</SiteLink><SiteLink to="/contact">{t('contact')}</SiteLink>{isAdmin&&<SiteLink to="/admin" className="admin-entry">{t('admin')}</SiteLink>}</nav></div></div></header>
 <Dialog open={open} title="CNM" onClose={()=>setOpen(false)} className="mobile-drawer"><nav className="drawer-links">{[...links,['/about','about'],['/contact','contact'],['/sponsor','sponsor'],['/account','account'],...(isAdmin?[['/admin','admin']]:[])].map(([to,label])=><SiteLink key={to} to={to} onClick={()=>setOpen(false)}>{t(label)}<Icon name="arrow"/></SiteLink>)}</nav></Dialog></>
}
