import {useState} from 'react'
import {type VideoRef,isVideoRef,videoEmbedUrl,videoSourceUrl} from '../../shared/media/video'
import {useLocale} from '../../shared/i18n'
import {Icon} from '../../design/Icon'
export function VideoEmbed({video,label}:{video:VideoRef;label?:string}){
 const {t}=useLocale(),[loaded,setLoaded]=useState(false)
 if(!isVideoRef(video))return null
 return <figure className="video-block"><div className="video-frame">{loaded?<iframe title={label||t('watch')} src={videoEmbedUrl(video)} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<button type="button" onClick={()=>setLoaded(true)} aria-label={t('videoLoad')}><span className="video-play"><Icon name="play" size={30}/></span><strong>{label||t('videoLoad')}</strong><span>{video.provider==='youtube'?'YouTube':'Vimeo'}</span></button>}</div><figcaption>{t('videoPrivacy')} <a href={videoSourceUrl(video)} target="_blank" rel="noopener noreferrer">{t('videoSource')}</a></figcaption></figure>
}
