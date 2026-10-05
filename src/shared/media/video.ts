export type VideoRef={provider:'youtube'|'vimeo';videoId:string}
const youtubeId=/^[A-Za-z0-9_-]{11}$/
const vimeoId=/^[1-9][0-9]{0,11}$/
export function normalizeVideoUrl(raw:string):VideoRef|null {
 if(typeof raw!=='string'||raw.length>2048)return null
 try {
  const u=new URL(raw.trim());if(u.protocol!=='https:'||u.username||u.password||u.port)return null
  const host=u.hostname.toLowerCase()
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host)){
   let id=''
   if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[1]
   else if(u.pathname==='/watch')id=u.searchParams.get('v')||''
   else if(/^\/(embed|shorts)\/[A-Za-z0-9_-]{11}\/?$/.test(u.pathname))id=u.pathname.split('/')[2]
   return youtubeId.test(id)?{provider:'youtube',videoId:id}:null
  }
  if(['vimeo.com','www.vimeo.com'].includes(host)&&/^\/[1-9][0-9]{0,11}\/?$/.test(u.pathname)&&!u.searchParams.has('h'))return {provider:'vimeo',videoId:u.pathname.split('/')[1]}
 }catch{/* Invalid URLs are field errors, never executed. */}
 return null
}
export function isVideoRef(v:unknown):v is VideoRef {if(!v||typeof v!=='object')return false;const x=v as VideoRef;return (x.provider==='youtube'&&youtubeId.test(x.videoId))||(x.provider==='vimeo'&&vimeoId.test(x.videoId))}
export function videoEmbedUrl(video:VideoRef):string {
 if(!isVideoRef(video))return ''
 return video.provider==='youtube'?`https://www.youtube-nocookie.com/embed/${video.videoId}?playsinline=1&rel=0`:`https://player.vimeo.com/video/${video.videoId}?dnt=1`
}
export function videoSourceUrl(video:VideoRef):string {if(!isVideoRef(video))return '';return video.provider==='youtube'?`https://www.youtube.com/watch?v=${video.videoId}`:`https://vimeo.com/${video.videoId}`}
