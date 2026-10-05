import {useEffect,useId,useRef,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {Icon} from './Icon'
import {useLocale} from '../shared/i18n'
export function Dialog({open,title,onClose,children,className=''}:{open:boolean;title:string;onClose:()=>void;children:ReactNode;className?:string}){
 const ref=useRef<HTMLDivElement>(null), closeRef=useRef(onClose), id=useId();closeRef.current=onClose
 const {t}=useLocale()
 useEffect(()=>{
  if(!open)return
  const previous=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  const focusables=()=>Array.from(ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')||[]).filter(el=>!el.hasAttribute('hidden'))
  const focus=()=>focusables()[0]?.focus();focus()
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();closeRef.current()}if(event.key==='Tab'){const els=focusables(),first=els[0],last=els.at(-1);if(!first){event.preventDefault();ref.current?.focus()}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}}
  document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus()}
 },[open])
 if(!open)return null
 return createPortal(<div className="dialog-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className={'dialog '+className} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
 <div className="dialog-heading"><h2 id={id}>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label={t('close')}><Icon name="close"/></button></div>{children}</div></div>,document.body)
}
