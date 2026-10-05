import {supabase} from '../../supabase'
import type {StationConfig,ScheduleSlot,Show,ArticleCategory} from '../../data'
import type {PublicArticle,Photo} from './article.model'
export type PublicationResult={station:StationConfig|null;articles:PublicArticle[];programs:ScheduleSlot[];errors:string[]}
async function hydrate(rows:PublicArticle[],signal:AbortSignal):Promise<PublicArticle[]>{
 if(!rows.length)return rows
 const categoryIds=[...new Set(rows.map(a=>a.category_id).filter((x):x is string=>Boolean(x)))],mediaIds=[...new Set(rows.flatMap(a=>[a.hero_media_id,...((a as PublicArticle&{gallery_media_ids?:string[]}).gallery_media_ids||[])]).filter((x):x is string=>Boolean(x)))]
 const [cats,media]=await Promise.all([categoryIds.length?supabase.from('article_categories').select('*').in('id',categoryIds).abortSignal(signal):{data:[],error:null},mediaIds.length?supabase.from('media_assets').select('*').in('id',mediaIds).abortSignal(signal):{data:[],error:null}]);if(cats.error||media.error)throw cats.error||media.error
 const categoryMap=new Map((cats.data||[]).map(c=>[c.id,c as ArticleCategory])),mediaMap=new Map((media.data||[]).map(m=>[m.id,m as Photo]))
 return rows.map(a=>{const metadata=(a as PublicArticle&{photo_metadata?:Record<string,Partial<Photo>>}).photo_metadata||{};const photo=(id:string)=>{const base=mediaMap.get(id);return base?{...base,...metadata[id]}:undefined};return {...a,category:categoryMap.get(a.category_id||'')||null,hero:photo(a.hero_media_id||'')||null,gallery:((a as PublicArticle&{gallery_media_ids?:string[]}).gallery_media_ids||[]).map(id=>photo(id)).filter((m):m is Photo=>Boolean(m))}})
}
export async function loadPublication(signal:AbortSignal):Promise<PublicationResult>{
 const result:PublicationResult={station:null,articles:[],programs:[],errors:[]}
 await Promise.all([
 (async()=>{const {data,error}=await supabase.from('station_config').select('*').eq('singleton',true).abortSignal(signal).single();if(error)result.errors.push('station');else result.station=data as StationConfig})(),
 (async()=>{const {data,error}=await supabase.from('articles').select('*').eq('status','published').lte('published_at',new Date().toISOString()).order('published_at',{ascending:false}).limit(40).abortSignal(signal);if(error){result.errors.push('articles');return}try{result.articles=await hydrate(data as PublicArticle[],signal)}catch{result.errors.push('articles')}})(),
 (async()=>{const {data,error}=await supabase.from('schedule_slots').select('*').eq('is_active',true).order('day_of_week').order('start_time').abortSignal(signal);if(error){result.errors.push('programs');return}const rows=data as ScheduleSlot[];if(!rows.length)return;const shows=await supabase.from('shows').select('*').in('id',[...new Set(rows.map(s=>s.show_id))]).eq('is_published',true).abortSignal(signal);if(shows.error){result.errors.push('programs');return}const map=new Map(shows.data.map(s=>[s.id,s as Show]));result.programs=rows.map(s=>({...s,show:map.get(s.show_id)})).filter(s=>Boolean(s.show))})()
 ])
 return result
}
export async function loadArticle(slug:string,signal:AbortSignal):Promise<PublicArticle|null>{const {data,error}=await supabase.from('articles').select('*').eq('slug',slug).eq('status','published').lte('published_at',new Date().toISOString()).abortSignal(signal).maybeSingle();if(error)throw error;return data?(await hydrate([data as PublicArticle],signal))[0]:null}
