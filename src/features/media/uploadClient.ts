import {api,ApiError} from '../../shared/api'
import {supabase} from '../../supabase'
import {photoInputError} from '../editorial/editorial.model'
export type PreparedImage={blob:Blob;width:number;height:number}
export async function prepareImage(file:File):Promise<PreparedImage>{
 const error=photoInputError(file,0);if(error)throw new ApiError(error)
 let source:CanvasImageSource,width:number,height:number,cleanup=()=>{}
 try{
  if(typeof createImageBitmap==='function'){const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});source=bitmap;width=bitmap.width;height=bitmap.height;cleanup=()=>bitmap.close()}
  else {const url=URL.createObjectURL(file);const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=reject;image.src=url});source=image;width=image.naturalWidth;height=image.naturalHeight;cleanup=()=>URL.revokeObjectURL(url)}
 }catch{throw new ApiError('imageUnsupported')}
 try{
  if(!width||!height||width*height>24000000)throw new ApiError('imageDimensions')
  const ratio=Math.min(1,1920/width,1920/height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));const context=canvas.getContext('2d');if(!context)throw new ApiError('imageUnsupported');context.drawImage(source,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new ApiError('imageUnsupported')),'image/webp',0.86))
  if(blob.size>10485760)throw new ApiError('imageTooLarge')
  return {blob,width:canvas.width,height:canvas.height}
 }finally{cleanup()}
}
export async function uploadPrivateImage(file:File,purpose:'draft'|'submission',scopeId:string,onProgress:(n:number)=>void):Promise<{id:string;preview:string}> {
 onProgress(5);const image=await prepareImage(file);onProgress(20)
 const ticket=await api<{id:string;bucket:string;path:string;token:string}>('media.begin',{purpose,scopeId,mimeType:image.blob.type,byteLength:image.blob.size})
 const {error}=await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path,ticket.token,image.blob,{contentType:image.blob.type,upsert:false,cacheControl:'0'});if(error)throw new ApiError('upload_failed')
 const sizes=[320,640,1280,1920]
 for(let i=0;i<sizes.length;i++){await api('media.process',{id:ticket.id,size:sizes[i]});onProgress(35+(i+1)*15)}
 const signed=await api<{urls:Record<string,string>}>('media.preview',{ids:[ticket.id]});onProgress(100)
 return {id:ticket.id,preview:signed.urls[ticket.id]||URL.createObjectURL(image.blob)}
}
