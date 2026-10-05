import {ImageMagick,initializeImageMagick,MagickFormat,ResourceLimits,ConfigurationFiles} from 'npm:@imagemagick/magick-wasm@0.0.43'
let ready:Promise<void>|null=null
export function signature(bytes:Uint8Array):'jpeg'|'png'|'webp'|null{
 if(bytes.length>=12&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg'
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return 'png'
 if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'webp'
 return null
}
async function initialize(){
 if(!ready)ready=(async()=>{
  const configurations=ConfigurationFiles.default
  configurations.policy.data='<policymap><policy domain="delegate" rights="none" pattern="*"/><policy domain="filter" rights="none" pattern="*"/><policy domain="coder" rights="none" pattern="*"/><policy domain="coder" rights="read|write" pattern="{JPEG,PNG,WEBP}"/><policy domain="path" rights="none" pattern="@*"/></policymap>'
  const bytes=await Deno.readFile(new URL(import.meta.resolve('npm:@imagemagick/magick-wasm@0.0.43/magick.wasm')))
  await initializeImageMagick(bytes,configurations)
  ResourceLimits.width=1920n;ResourceLimits.height=1920n;ResourceLimits.listLength=1n;ResourceLimits.memory=100663296n;ResourceLimits.disk=0n;ResourceLimits.maxMemoryRequest=100663296n;ResourceLimits.maxProfileSize=1048576n
 })()
 return ready
}
export async function transformImage(bytes:Uint8Array,size:number):Promise<{bytes:Uint8Array;width:number;height:number;sourceWidth:number;sourceHeight:number}>{
 if(!signature(bytes)||!bytes.length||bytes.length>10485760||![320,640,1280,1920].includes(size))throw new Error('invalid_media')
 await initialize()
 return ImageMagick.read(bytes,image=>{
  image.autoOrient();const sourceWidth=image.width,sourceHeight=image.height
  if(sourceWidth>1920||sourceHeight>1920||sourceWidth<1||sourceHeight<1)throw new Error('invalid_media')
  const scale=Math.min(1,size/sourceWidth),width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));image.resize(width,height);image.strip();image.quality=78
  const result=image.write(MagickFormat.WebP,data=>new Uint8Array(data))
  return {bytes:result,width,height,sourceWidth,sourceHeight}
 })
}
