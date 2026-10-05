import {useState} from 'react'
import {useLocale,localeOrder,localeNames} from '../../shared/i18n'
import {Icon} from '../../design/Icon'
import {Dialog} from '../../design/Dialog'
export function LanguageMenu(){
 const {locale,setLocale,t}=useLocale(),[open,setOpen]=useState(false)
 return <><button type="button" className="language-trigger" aria-label={t('chooseLanguage')} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><Icon name="globe" size={18}/><span>{locale.toUpperCase()}</span><Icon name="down" size={14}/></button>
 <Dialog open={open} title={t('chooseLanguage')} onClose={()=>setOpen(false)} className="language-dialog"><div role="radiogroup" aria-label={t('language')} className="language-options">{localeOrder.map(code=><button type="button" key={code} role="radio" aria-checked={code===locale} onClick={()=>{setLocale(code);setOpen(false)}}><span lang={code}>{localeNames[code]}</span><span className="language-code">{code.toUpperCase()}</span>{code===locale&&<Icon name="check" size={18}/>}</button>)}</div></Dialog></>
}
