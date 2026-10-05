import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig(({command})=>{
 const target=process.env.CNM_DEPLOY_TARGET||(command==='serve'?'domain':'pages')
 if(target!=='pages'&&target!=='domain')throw new Error('CNM_DEPLOY_TARGET must be pages or domain')
 const base=target==='pages'?'/cnm/':'/'
 return {plugins:[react()],base,define:{__CNM_SITE_BASE__:JSON.stringify(base),__CNM_SITE_ORIGIN__:JSON.stringify(target==='pages'?'https://creolenetworkmedia.github.io':'https://creolenetworkmedia.com')},build:{sourcemap:false,chunkSizeWarningLimit:500}}
})
