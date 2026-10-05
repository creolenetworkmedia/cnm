export type RadioState='off-air'|'idle'|'connecting'|'playing'|'paused'|'offline'|'failed'
export type RadioEvent={type:'UNAVAILABLE'|'AVAILABLE'|'PLAY'|'PLAYING'|'WAITING'|'PAUSE'|'OFFLINE'|'ONLINE'|'ERROR'|'TIMEOUT'}
export function reduceRadio(state:RadioState,event:RadioEvent):RadioState {
 switch(event.type){
 case 'UNAVAILABLE':return 'off-air'
 case 'AVAILABLE':return state==='off-air'?'idle':state
 case 'PLAY':return state==='off-air'?'off-air':'connecting'
 case 'PLAYING':return state==='off-air'?'off-air':'playing'
 case 'WAITING':return ['playing','connecting'].includes(state)?'connecting':state
 case 'PAUSE':return state==='off-air'?'off-air':'paused'
 case 'OFFLINE':return state==='off-air'?'off-air':'offline'
 case 'ONLINE':return state==='offline'?'idle':state
 case 'ERROR':case 'TIMEOUT':return state==='off-air'?'off-air':'failed'
 }
}
export function selectStream(config:{stream_enabled?:boolean;primary_stream_url?:string|null;low_data_stream_url?:string|null}|null,lowData:boolean):string|null {
 if(!config?.stream_enabled)return null
 const url=lowData&&config.low_data_stream_url?config.low_data_stream_url:config.primary_stream_url
 if(!url)return null
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?parsed.href:null}catch{return null}
}
