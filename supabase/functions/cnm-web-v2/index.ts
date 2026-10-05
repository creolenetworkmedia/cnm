import {createClient} from 'npm:@supabase/supabase-js@2.75.0'
import {validateInquiry,validateDraftSnapshot,canPublish,ValidationError,UUID} from './shared/contracts/forms.ts'
import {validateSubmission} from './shared/contracts/submission.ts'
const ACTIONS=new Set(['draft.list','draft.get','draft.save','draft.publish','article.unpublish','article.delete','inquiry.submit','inquiry.list','inquiry.update','media.begin','media.process','media.preview','submission.submit','submission.list','submission.update','submission.media','radio.song','radio.dedication','station.update'])
const ALLOWED_ORIGINS=new Set(['https://creolenetworkmedia.com','https://www.creolenetworkmedia.com','https://creolenetworkmedia.github.io','http://localhost:5173','http://localhost:4173','http://127.0.0.1:4173'])
const publicURL=Deno.env.get('SUPABASE_URL')||'',serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
function cors(origin:string|null){return {'Access-Control-Allow-Origin':origin&&ALLOWED_ORIGINS.has(origin)?origin:'https://creolenetworkmedia.com','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'}}
function response(origin:string|null,status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json'}})}
function cleanObject(input:unknown,keys:string[]){if(!input||typeof input!=='object'||Array.isArray(input))throw new ValidationError('invalid_request');const p=input as Record<string,unknown>;if(Object.keys(p).some(k=>!keys.includes(k)))throw new ValidationError('invalid_field');return p}
function id(value:unknown){if(typeof value!=='string'||!UUID.test(value))throw new ValidationError('invalid_request');return value}
function text(value:unknown,max:number,required=false){if(value==null&&!required)return '';if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new ValidationError('invalid_request');return value.trim()}
function revision(value:unknown){if(!Number.isSafeInteger(value)||Number(value)<0)throw new ValidationError('invalid_request');return Number(value)}
function timestamp(value:unknown){if(value==null)return null;if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new ValidationError('invalid_request');return value}
function validate(action:string,input:unknown):Record<string,unknown>{
 if(action==='station.update'){const p=cleanObject(input,['primary_stream_url','low_data_stream_url','stream_enabled','donation_url']);for(const key of ['primary_stream_url','low_data_stream_url','donation_url']){const value=text(p[key],2048);if(value){const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new ValidationError('invalid_request')}p[key]=value}if(typeof p.stream_enabled!=='boolean'||(p.stream_enabled&&!p.primary_stream_url))throw new ValidationError('invalid_request');return p}
 if(action==='inquiry.submit')return {...validateInquiry(input)}
 if(action==='submission.submit')return {...validateSubmission(input)}
 if(['draft.list','inquiry.list','submission.list'].includes(action)){cleanObject(input,[]);return {}}
 if(['draft.get','submission.media'].includes(action)){const p=cleanObject(input,['id']);return {id:id(p.id)}}
 if(action==='draft.save'){const p=cleanObject(input,['id','articleId','expectedRevision','baseUpdatedAt','snapshot']);return {id:id(p.id),articleId:p.articleId?id(p.articleId):null,expectedRevision:revision(p.expectedRevision),baseUpdatedAt:timestamp(p.baseUpdatedAt),snapshot:validateDraftSnapshot(p.snapshot)}}
 if(action==='draft.publish'){const p=cleanObject(input,['id','expectedRevision','baseUpdatedAt']);return {id:id(p.id),expectedRevision:revision(p.expectedRevision),baseUpdatedAt:timestamp(p.baseUpdatedAt)}}
 if(['article.unpublish','article.delete'].includes(action)){const p=cleanObject(input,['id','expectedUpdatedAt']);if(!timestamp(p.expectedUpdatedAt))throw new ValidationError('invalid_request');return {id:id(p.id),expectedUpdatedAt:timestamp(p.expectedUpdatedAt)}}
 if(['inquiry.update','submission.update'].includes(action)){const p=cleanObject(input,['id','status','note','expectedUpdatedAt']),statuses=action==='inquiry.update'?['new','discussing','agreed','closed']:['pending','reviewing','accepted','rejected'];if(!statuses.includes(String(p.status))||!timestamp(p.expectedUpdatedAt))throw new ValidationError('invalid_request');return {id:id(p.id),status:p.status,note:text(p.note,5000),expectedUpdatedAt:timestamp(p.expectedUpdatedAt)}}
 if(action==='media.begin'){const p=cleanObject(input,['purpose','scopeId','mimeType','byteLength']);if(!['draft','submission'].includes(String(p.purpose))||!['image/jpeg','image/png','image/webp'].includes(String(p.mimeType))||!Number.isSafeInteger(p.byteLength)||Number(p.byteLength)<1||Number(p.byteLength)>10485760)throw new ValidationError('invalid_media');return {purpose:p.purpose,scopeId:id(p.scopeId),mimeType:p.mimeType,byteLength:p.byteLength}}
 if(action==='media.process'){const p=cleanObject(input,['id','size']);if(![320,640,1280,1920].includes(Number(p.size))||typeof p.size!=='number')throw new ValidationError('invalid_media');return {id:id(p.id),size:p.size}}
 if(action==='media.preview'){const p=cleanObject(input,['ids']);if(!Array.isArray(p.ids)||p.ids.length>11)throw new ValidationError('invalid_media');return {ids:p.ids.map(id)}}
 if(action==='radio.song'||action==='radio.dedication'){const p=cleanObject(input,['name','title','artist','recipient','message','locale']);if(!['en','fr','ht','es'].includes(String(p.locale)))throw new ValidationError('invalid_locale');return {name:text(p.name,80,true),title:text(p.title,160,action==='radio.song'),artist:text(p.artist,160),recipient:text(p.recipient,80,action==='radio.dedication'),message:text(p.message,action==='radio.song'?500:700,action==='radio.dedication'),locale:p.locale}}
 throw new ValidationError('invalid_action')
}
async function readBody(req:Request){
 const reader=req.body?.getReader();if(!reader)throw new ValidationError('invalid_request');let length=0;const chunks:Uint8Array[]=[]
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>1048576){await reader.cancel();throw new ValidationError('too_large')}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new ValidationError('invalid_request')}
}
async function hash(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
type Service=ReturnType<typeof createClient>
async function ensurePrivateBucket(service:Service,name:string,mimes:string[]){
 const current=await service.storage.getBucket(name)
 if(current.data){if(current.data.public)throw new Error('unsafe_bucket');return}
 if(String(current.error?.message).toLowerCase().includes('not found')){const created=await service.storage.createBucket(name,{public:false,fileSizeLimit:10485760,allowedMimeTypes:mimes});if(created.error){const check=await service.storage.getBucket(name);if(check.error||check.data.public)throw new Error('storage_unavailable')}}else throw new Error('storage_unavailable')
}
function statusCode(code:string){if(['forbidden','invalid_media'].includes(code))return 403;if(code==='not_authenticated')return 401;if(code==='conflict')return 409;if(code==='rate_limited')return 429;if(['service_unavailable','not_configured'].includes(code))return 503;return 400}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');if(origin&&!ALLOWED_ORIGINS.has(origin))return response(origin,403,{error:'forbidden'})
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)})
 if(req.method!=='POST')return response(origin,405,{error:'method_not_allowed'})
 if(!publicURL||!serviceKey)return response(origin,503,{error:'not_configured'})
 let service:Service|null=null,actor:string|null=null,action=''
 try{
  const body=cleanObject(await readBody(req),['action','payload','requestId']);if(typeof body.action!=='string'||!ACTIONS.has(body.action))throw new ValidationError('invalid_action');action=body.action
  const payload=validate(action,body.payload||{}),requestId=id(body.requestId)
  service=createClient(publicURL,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
  if(token.split('.').length===3){const {data,error}=await service.auth.getUser(token);if(error||!data.user)throw new ValidationError('not_authenticated');actor=data.user.id}
  if(!actor&&action!=='inquiry.submit')throw new ValidationError('not_authenticated')
  const rpc=async(command:string,args:unknown={},receipt=crypto.randomUUID())=>{const {data,error}=await service!.rpc('cnm_web_service_v2',{p_actor:actor,p_action:command,p_payload:args,p_request_id:receipt});if(error){const known=['forbidden','not_authenticated','invalid_request','invalid_content','invalid_media','upload_expired','conflict','rate_limited'];throw new ValidationError(known.includes(error.message)?error.message:error.code==='23505'?'conflict':'service_unavailable')}return data}
  if(action==='media.begin'){
   const ticket=await rpc(action,payload,requestId)
   await ensurePrivateBucket(service,'cnm-web-intake',['image/jpeg','image/png','image/webp']);await ensurePrivateBucket(service,'cnm-web-staged',['image/webp'])
   const {data,error}=await service.storage.from('cnm-web-intake').createSignedUploadUrl(ticket.source_path,{upsert:false});if(error)throw new Error('storage_unavailable')
   return response(origin,200,{id:ticket.id,bucket:'cnm-web-intake',path:ticket.source_path,token:data.token})
  }
  if(action==='media.process'){
   const ticket=await rpc('media.get',{id:payload.id}),size=String(payload.size)
   if(ticket.variants?.[size])return response(origin,200,{id:ticket.id,status:ticket.status})
   const {data:original,error}=await service.storage.from('cnm-web-intake').download(ticket.source_path);if(error||!original||original.size!==ticket.byte_length||original.size>10485760)throw new ValidationError('invalid_media')
   const bytes=new Uint8Array(await original.arrayBuffer()),sourceHash=await hash(bytes);if(ticket.source_hash&&ticket.source_hash!==sourceHash)throw new ValidationError('conflict')
   const {transformImage}=await import('./images.ts');let output
   try{output=await transformImage(bytes,Number(payload.size))}catch{await rpc('media.fail',{id:ticket.id});throw new ValidationError('invalid_media')}
   const path=actor+'/'+ticket.id+'/'+size+'.webp',variant={path,width:output.width,height:output.height,bytes:output.bytes.length,hash:await hash(output.bytes)}
   const stored=await service.storage.from('cnm-web-staged').upload(path,output.bytes,{contentType:'image/webp',upsert:false,cacheControl:'0'})
   if(stored.error){const existing=await service.storage.from('cnm-web-staged').download(path);if(existing.error||await hash(new Uint8Array(await existing.data.arrayBuffer()))!==variant.hash)throw new Error('storage_unavailable')}
   const result=await rpc('media.variant',{id:ticket.id,size:Number(size),sourceHash,width:output.sourceWidth,height:output.sourceHeight,variant},requestId)
   return response(origin,200,{id:ticket.id,status:result.status})
  }
  if(action==='media.preview'||action==='submission.media'){
   const tickets=action==='media.preview'?await Promise.all((payload.ids as string[]).map(item=>rpc('media.get',{id:item}))):(await rpc('submission.media',payload)).media
   const urls:Record<string,string>={}
   for(const ticket of tickets){const variant=ticket.variants?.['640']||ticket.variants?.['320'];if(!variant)continue;const signed=await service.storage.from('cnm-web-staged').createSignedUrl(variant.path,120);if(signed.error)throw new Error('storage_unavailable');urls[ticket.id]=signed.data.signedUrl}
   return response(origin,200,{urls})
  }
  if(action==='draft.publish'){
   // Separate idempotency namespace for final publication. The original request ID is retained.
   const cached=await rpc('draft.result',{...payload,requestId});if(cached.found)return response(origin,200,cached.response)
   const prepared=await rpc('draft.prepare',payload);validateDraftSnapshot(prepared.draft.snapshot);if(!canPublish(prepared.draft.snapshot))throw new ValidationError('invalid_content')
   const assets:{uploadId:string;sourceHash:string;prefix:string}[]=[],created:string[]=[]
   try{
    for(const ticket of prepared.uploads){const prefix='web-v2/'+ticket.id+'/';assets.push({uploadId:ticket.id,sourceHash:ticket.source_hash,prefix});
     await Promise.all([320,640,1280,1920].map(async size=>{const variant=ticket.variants[String(size)];if(!variant)throw new ValidationError('invalid_media');const destination=prefix+size+'.webp';const source=await service!.storage.from('cnm-web-staged').download(variant.path);if(source.error||!source.data)throw new Error('storage_unavailable');const bytes=new Uint8Array(await source.data.arrayBuffer());if(await hash(bytes)!==variant.hash)throw new ValidationError('invalid_media');const uploaded=await service!.storage.from('cnm-media').upload(destination,bytes,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(!uploaded.error)created.push(destination);else{const existing=await service!.storage.from('cnm-media').download(destination);if(existing.error||await hash(new Uint8Array(await existing.data.arrayBuffer()))!==variant.hash)throw new Error('storage_unavailable')}}))
    }
    const result=await rpc('draft.finalize',{...payload,assets},requestId);return response(origin,200,result)
   }catch(error){
    // Never remove an asset already referenced by a successfully published article after a retry.
    for(const ticket of prepared.uploads){const {data, error:lookupError}=await service.from('media_assets').select('id').eq('id',ticket.id).maybeSingle();if(!lookupError&&!data){const paths=created.filter(p=>p.startsWith('web-v2/'+ticket.id+'/'));if(paths.length)await service.storage.from('cnm-media').remove(paths)}}
    throw error
   }
  }
  return response(origin,200,await rpc(action,payload,requestId))
 }catch(error){const code=error instanceof ValidationError?error.code:'service_unavailable';return response(origin,statusCode(code),{error:code})}
})
