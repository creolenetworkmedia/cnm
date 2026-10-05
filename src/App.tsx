import {Component,useEffect,useState,type ReactNode} from 'react'
import {LocaleProvider,useLocale} from './shared/i18n'
import {RouterProvider,useRouter,SiteLink} from './app/router'
import {getSiteConfig} from './app/config'
import {toSitePath} from './app/paths'
import {AuthProvider,useAuth} from './features/account/AuthProvider'
import {AccountPage} from './features/account/AccountPage'
import {SiteHeader} from './features/navigation/SiteHeader'
import {SiteFooter} from './features/navigation/SiteFooter'
import {RadioProvider} from './features/radio/RadioProvider'
import {RadioStrip,MiniPlayer} from './features/radio/RadioStrip'
import {ListenPage} from './features/radio/ListenPage'
import {HomePage} from './features/articles/HomePage'
import {NewsPage} from './features/articles/NewsPage'
import {ArticlePage} from './features/articles/ArticlePage'
import {loadPublication,type PublicationResult} from './features/articles/article.queries'
import {ProgramsPage} from './features/programs/ProgramsPage'
import {CommunityPage} from './features/operations/CommunityPage'
import {ContactPage} from './features/operations/ContactPage'
import {SponsorPage} from './features/operations/SponsorPage'
import {SupportPage} from './features/operations/SupportPage'
import {AboutPage} from './features/operations/AboutPage'
import {PolicyPage} from './policies/PolicyPage'
import {EditorPage} from './features/editorial/EditorPage'
import {SubmitStoryPage} from './features/operations/SubmitStoryPage'
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="container standard-page"><h1>Creole Network Media</h1><p>Unable to display this page. / Impossible d'afficher cette page.</p><a href={toSitePath('/',getSiteConfig().base)}>CNM</a></div>:this.props.children}}
function Shell(){
 const {route}=useRouter(),{t,locale}=useLocale(),auth=useAuth(),[attempt,setAttempt]=useState(0),[loading,setLoading]=useState(true),[data,setData]=useState<PublicationResult>({station:null,articles:[],programs:[],errors:[]})
 useEffect(()=>{const controller=new AbortController();let active=true;setLoading(true);const timer=setTimeout(()=>controller.abort(),15000);loadPublication(controller.signal).then(result=>{if(active)setData(result)}).catch(()=>{if(active)setData(d=>({...d,errors:['network']}))}).finally(()=>{clearTimeout(timer);if(active)setLoading(false)});return()=>{active=false;clearTimeout(timer);controller.abort()}},[attempt])
 useEffect(()=>{
  const title=route.page==='home'?'Creole Network Media':t(route.page==='article'?'news':route.page==='sponsor'?'sponsor':route.page==='submit-story'?'submitArticle':route.page==='editorial-policy'?'standardsHeading':route.page)+' | CNM'
  document.title=title
  const config=getSiteConfig();let canonical=document.querySelector<HTMLLinkElement>('link[rel=canonical]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=config.origin+window.location.pathname
  let robots=document.querySelector<HTMLMetaElement>('meta[name=robots]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.appendChild(robots)}robots.content=['admin','account','terms','privacy','editorial-policy','not-found'].includes(route.page)?'noindex, follow':'index, follow'
 },[route,locale])
 useEffect(()=>{const viewport=window.visualViewport;const resize=()=>document.body.classList.toggle('keyboard-open',Boolean(viewport&&window.innerHeight-viewport.height>150));viewport?.addEventListener('resize',resize);return()=>{viewport?.removeEventListener('resize',resize);document.body.classList.remove('keyboard-open')}},[])
 const retry=()=>setAttempt(v=>v+1),publication={articles:data.articles,loading,error:data.errors.includes('articles')||data.errors.includes('network'),onRetry:retry}
 return <RadioProvider station={data.station}><div className="app-shell has-player" data-cnm-design="editorial-v2"><SiteHeader isAdmin={auth.isAdmin} signedIn={Boolean(auth.session)}/>{route.page!=='listen'&&route.page!=='admin'&&<RadioStrip/>}<main id="main-content" tabIndex={-1}>
 {route.page==='home'&&<HomePage {...publication} programs={data.programs}/>}
 {route.page==='news'&&<NewsPage {...publication}/>}{route.page==='watch'&&<NewsPage {...publication} watch/>}
 {route.page==='article'&&<ArticlePage slug={route.slug}/>}{route.page==='listen'&&<ListenPage/>}
 {route.page==='programs'&&<ProgramsPage programs={data.programs}/>}{route.page==='community'&&<CommunityPage/>}
 {route.page==='contact'&&<ContactPage/>}{route.page==='sponsor'&&<SponsorPage/>}{route.page==='support'&&<SupportPage station={data.station}/>}{route.page==='about'&&<AboutPage/>}
 {route.page==='account'&&<AccountPage/>}{route.page==='admin'&&<EditorPage onPublished={retry}/>}{route.page==='submit-story'&&<SubmitStoryPage/>}
 {(route.page==='terms'||route.page==='privacy'||route.page==='editorial-policy')&&<PolicyPage kind={route.page==='editorial-policy'?'editorial':route.page}/>}
 {route.page==='not-found'&&<div className="container standard-page"><h1>{t('notFound')}</h1><SiteLink to="/" className="button">{t('backHome')}</SiteLink></div>}
 </main>{route.page!=='admin'&&<SiteFooter/>}<MiniPlayer/></div></RadioProvider>
}
export default function App(){return <ErrorBoundary><LocaleProvider><RouterProvider><AuthProvider><Shell/></AuthProvider></RouterProvider></LocaleProvider></ErrorBoundary>}
