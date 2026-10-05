import http from 'node:http'
import {readFile,stat} from 'node:fs/promises'
import {resolve,extname} from 'node:path'
const root=resolve('dist'),base=process.env.CNM_DEPLOY_TARGET==='domain'?'/':'/cnm/'
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.wav':'audio/wav'}
http.createServer(async(req,res)=>{
 let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 if(base!=='/'&&path==='/cnm'){res.writeHead(302,{Location:base});return res.end()}
 if(!path.startsWith(base)){res.writeHead(404);return res.end('Not found')}
 let file=resolve(root,'.'+path.slice(base.length-1))
 if(file!==root&&!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
 try {if((await stat(file)).isDirectory())file+='/index.html';const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data)}catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(root+'/404.html'))}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('CNM preview',base))
