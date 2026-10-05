import {getPublicMediaUrl} from '../../data'
import type {Photo} from '../articles/article.model'
export function ResponsivePhoto({asset,alt,priority=false,lowData=false,caption,credit}:{asset:Photo;alt:string;priority?:boolean;lowData?:boolean;caption?:string;credit?:string}){
 const paths=[asset.tiny_path,asset.small_path,asset.medium_path,asset.large_path],widths=[320,640,1280,1920]
 const variants=paths.flatMap((path,i)=>path?[{url:getPublicMediaUrl({...asset,original_path:path}),width:Math.min(widths[i],asset.width||widths[i])}]:[])
 const fallback=getPublicMediaUrl(asset),src=(lowData?variants.find(v=>v.width>=320)?.url:variants.find(v=>v.width>=1280)?.url)||variants.at(-1)?.url||fallback
 if(!src)return null
 return <figure className="photo"><img src={src} srcSet={!lowData&&variants.length?variants.map(v=>`${v.url} ${v.width}w`).join(', '):undefined} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 65vw, 960px" alt={alt} width={asset.width||1600} height={asset.height||1000} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/>{(caption||credit)&&<figcaption>{caption}{credit&&<span>{credit}</span>}</figcaption>}</figure>
}
