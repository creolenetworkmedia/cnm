import {assetPath} from '../app/config'
export function Brand({white=false,className=''}:{white?:boolean;className?:string}) {
 return <img className={'cnm-brand '+className} src={assetPath('brand/cnm-logo-'+(white?'white':'black')+'.png')} width="1577" height="678" alt="Creole Network Media" decoding="async" />
}
