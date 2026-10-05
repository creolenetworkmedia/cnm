import {supabase} from '../supabase'
export class ApiError extends Error{code:string;constructor(code:string){super(code);this.code=code}}
export async function api<T>(action:string,payload:unknown={},requestId?:string):Promise<T>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),action==='draft.publish'?90000:30000)
 let result;try{result=await supabase.functions.invoke('cnm-web-v2',{body:{action,payload,requestId:requestId||crypto.randomUUID()},signal:controller.signal})}finally{clearTimeout(timer)}
 const {data,error}=result
 if(error){let code='service_unavailable';try{const body=await error.context?.json();code=body?.error||code}catch{}throw new ApiError(code)}
 if(data?.error)throw new ApiError(data.error)
 return data as T
}
export function errorKey(error:unknown):string{const code=error instanceof ApiError?error.code:'';if(code==='rate_limited')return 'rateLimited';if(code==='conflict')return 'conflict';if(code==='forbidden'||code==='not_authenticated')return 'adminOnly';if(code==='invalid_content')return 'publishNeedsContent';if(code==='invalid_media'||code==='upload_expired')return 'imageUnsupported';if(code==='invalid_video')return 'videoInvalid';if(code==='not_configured'||code==='service_unavailable')return 'featureNotReady';return 'formError'}
