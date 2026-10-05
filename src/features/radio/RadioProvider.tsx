import {createContext,useContext,useEffect,useReducer,useRef,useState,type ReactNode} from 'react'
import type {StationConfig} from '../../data'
import {reduceRadio,selectStream,type RadioState} from './radio.machine'
export type DataSaverMode='auto'|'on'|'off'
type RadioContextValue={state:RadioState;play:()=>void;pause:()=>void;retry:()=>void;streamAvailable:boolean;engaged:boolean;dataSaver:DataSaverMode;setDataSaver:(mode:DataSaverMode)=>void;lowData:boolean}
const Context=createContext<RadioContextValue|null>(null)
function savedMode():DataSaverMode{try{const value=localStorage.getItem('cnm-data-saver');return value==='on'||value==='off'?value:'auto'}catch{return 'auto'}}
export function RadioProvider({station,children}:{station:StationConfig|null;children:ReactNode}){
 const [state,dispatch]=useReducer(reduceRadio,'off-air'),[engaged,setEngaged]=useState(false),[dataSaver,setMode]=useState<DataSaverMode>(savedMode)
 const connection=typeof navigator==='undefined'?undefined:(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection
 const lowData=dataSaver==='on'||(dataSaver==='auto'&&Boolean(connection?.saveData||connection?.effectiveType==='2g'||connection?.effectiveType==='slow-2g'))
 const source=selectStream(station,lowData),audio=useRef<HTMLAudioElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),intended=useRef(false),attempt=useRef(0)
 const sourceRef=useRef(source);sourceRef.current=source
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null}
 const deadline=()=>{cancel();const id=attempt.current;timer.current=setTimeout(()=>{if(id!==attempt.current||!intended.current)return;intended.current=false;audio.current?.pause();dispatch({type:'TIMEOUT'})},15000)}
 useEffect(()=>{
  const player=new Audio();player.preload='none';audio.current=player
  const started=()=>{if(!intended.current){player.pause();return}cancel();dispatch({type:'PLAYING'})}
  const waiting=()=>{if(intended.current){dispatch({type:'WAITING'});deadline()}}
  const failed=()=>{if(!intended.current)return;intended.current=false;cancel();dispatch({type:'ERROR'})}
  const ended=()=>{intended.current=false;cancel();dispatch({type:'PAUSE'})}
  const offline=()=>{intended.current=false;attempt.current++;cancel();player.pause();dispatch({type:'OFFLINE'})}
  const online=()=>dispatch({type:sourceRef.current?'ONLINE':'UNAVAILABLE'})
  player.addEventListener('playing',started);player.addEventListener('waiting',waiting);player.addEventListener('stalled',waiting);player.addEventListener('error',failed);player.addEventListener('ended',ended)
  window.addEventListener('offline',offline);window.addEventListener('online',online)
  return()=>{attempt.current++;intended.current=false;cancel();player.pause();player.removeAttribute('src');player.load();audio.current=null;window.removeEventListener('offline',offline);window.removeEventListener('online',online);player.removeEventListener('playing',started);player.removeEventListener('waiting',waiting);player.removeEventListener('stalled',waiting);player.removeEventListener('error',failed);player.removeEventListener('ended',ended)}
 },[])
 useEffect(()=>{attempt.current++;intended.current=false;cancel();audio.current?.pause();if(audio.current){if(source)audio.current.src=source;else audio.current.removeAttribute('src')}dispatch({type:'UNAVAILABLE'});if(source)dispatch({type:navigator.onLine?'AVAILABLE':'OFFLINE'})},[source])
 const pause=()=>{attempt.current++;intended.current=false;cancel();audio.current?.pause();dispatch({type:source?'PAUSE':'UNAVAILABLE'})}
 const play=()=>{
  if(!source||!audio.current)return
  if(!navigator.onLine){dispatch({type:'OFFLINE'});return}
  const id=++attempt.current;intended.current=true;setEngaged(true);dispatch({type:'PLAY'});deadline()
  audio.current.play().catch(()=>{if(id===attempt.current&&intended.current){intended.current=false;cancel();dispatch({type:'ERROR'})}})
 }
 const retry=()=>{audio.current?.load();play()}
 const setDataSaver=(mode:DataSaverMode)=>{setMode(mode);try{localStorage.setItem('cnm-data-saver',mode)}catch{}}
 return <Context.Provider value={{state,play,pause,retry,streamAvailable:Boolean(source),engaged,dataSaver,setDataSaver,lowData}}>{children}</Context.Provider>
}
export function useRadio(){const value=useContext(Context);if(!value)throw new Error('RadioProvider required');return value}
