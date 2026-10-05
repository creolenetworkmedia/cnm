import {createContext,useContext,useState,useEffect,useCallback,type ReactNode,type AnchorHTMLAttributes} from 'react'
import {getSiteConfig} from './config'
import {parseSitePath,toSitePath,type Route} from './paths'
let activeGuard:(()=>boolean)|null=null
export function useNavigationGuard(enabled:boolean,message:string){useEffect(()=>{if(!enabled)return;const guard=()=>window.confirm(message);activeGuard=guard;return()=>{if(activeGuard===guard)activeGuard=null}},[enabled,message])}
const RouterContext=createContext<{route:Route;go:(to:string)=>void}|null>(null)
export function RouterProvider({children}:{children:ReactNode}) {
  const [route,setRoute]=useState(()=>parseSitePath(window.location.pathname,getSiteConfig().base))
  useEffect(()=>{const update=()=>setRoute(parseSitePath(window.location.pathname,getSiteConfig().base));window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update)},[])
  const go=useCallback((to:string)=>{
    if(activeGuard&&!activeGuard())return
    const path=toSitePath(to,getSiteConfig().base)
    if(window.location.pathname+window.location.search!==path)window.history.pushState({},'',path)
    setRoute(parseSitePath(window.location.pathname,getSiteConfig().base))
    window.scrollTo({top:0,behavior:'auto'})
  },[])
  return <RouterContext.Provider value={{route,go}}>{children}</RouterContext.Provider>
}
export function useRouter(){const r=useContext(RouterContext);if(!r)throw new Error('RouterProvider missing');return r}
export function SiteLink({to,onClick,children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{to:string}) {
 const {go}=useRouter()
 return <a {...props} href={toSitePath(to,getSiteConfig().base)} onClick={e=>{onClick?.(e);if(!e.defaultPrevented&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&props.target!=='_blank'){e.preventDefault();go(to)}}}>{children}</a>
}
