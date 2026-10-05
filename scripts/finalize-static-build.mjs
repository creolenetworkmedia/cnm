import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises'
const base=process.env.CNM_DEPLOY_TARGET==='domain'?'/':'/cnm/'
const html=await readFile('dist/index.html','utf8')
await writeFile('dist/404.html',html)
for(const route of ['listen','news','programs','community','support','about','account','admin','watch','contact','sponsor','submit-story','terms','privacy','editorial-policy']){
 await mkdir(`dist/${route}`,{recursive:true});await writeFile(`dist/${route}/index.html`,html)
}
if(base==='/')await copyFile('public/CNAME','dist/CNAME');else await rm('dist/CNAME',{force:true})
await writeFile('dist/.nojekyll','')
await writeFile('dist/build-info.json',JSON.stringify({base,commit:process.env.GITHUB_SHA||'local-preview'}))
