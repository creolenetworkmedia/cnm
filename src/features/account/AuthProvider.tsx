import {createContext,useContext,useEffect,useState,useRef,type ReactNode} from 'react'
import type {Session} from '@supabase/supabase-js'
import {supabase} from '../../supabase'
const Context=createContext<{session:Session|null;isAdmin:boolean;loading:boolean;error:boolean;recovery:boolean;clearRecovery:()=>void;refreshRole:()=>Promise<void>}|null>(null)
export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[isAdmin,setAdmin]=useState(false),[error,setError]=useState(false),[recovery,setRecovery]=useState(false),generation=useRef(0),identity=useRef<string|null>(null)
 useEffect(()=>{
  let active=true,eventVersion=0;const timeout=setTimeout(()=>{if(active){setLoading(false);setError(true)}},15000)
  supabase.auth.getSession().then(({data,error})=>{if(active&&eventVersion===0){identity.current=data.session?.user.id||null;setSession(data.session);setError(Boolean(error));setLoading(false);clearTimeout(timeout)}}).catch(()=>{if(active){setError(true);setLoading(false);clearTimeout(timeout)}})
  const {data}=supabase.auth.onAuthStateChange((event,next)=>{if(active){eventVersion++;generation.current++;const nextId=next?.user.id||null;if(identity.current!==nextId||event==='SIGNED_OUT')setAdmin(false);identity.current=nextId;setSession(next);if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')setRecovery(false);setLoading(false);clearTimeout(timeout)}})
  return()=>{active=false;clearTimeout(timeout);generation.current++;data.subscription.unsubscribe()}
 },[])
 const refreshRole=async()=>{const current=++generation.current;if(!session){setAdmin(false);return}const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const {data,error}=await supabase.rpc('current_user_is_admin').abortSignal(controller.signal);if(generation.current===current){if(error)setError(true);else{setAdmin(data===true);setError(false)}}}catch{if(generation.current===current)setError(true)}finally{clearTimeout(timer)}}
 useEffect(()=>{refreshRole();const check=()=>{if(document.visibilityState==='visible')refreshRole()};document.addEventListener('visibilitychange',check);return()=>{generation.current++;document.removeEventListener('visibilitychange',check)}},[session?.user.id,session?.access_token])
 return <Context.Provider value={{session,isAdmin,loading,error,recovery,clearRecovery:()=>setRecovery(false),refreshRole}}>{children}</Context.Provider>
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider required');return value}
