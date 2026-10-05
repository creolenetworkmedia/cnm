import {useEffect,useState,type FormEvent} from 'react'
import {useLocale} from '../../shared/i18n'
import {useRadio} from '../radio/RadioProvider'
import {Field} from '../../design/Field'
import {getStation} from '../../data'
import {api,errorKey} from '../../shared/api'
export function StationSettings({onSaved}:{onSaved:()=>void}){
 const {t}=useLocale(),[form,setForm]=useState({primary_stream_url:'',low_data_stream_url:'',stream_enabled:false,donation_url:''}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 useEffect(()=>{let active=true;getStation().then(s=>{if(active)setForm({primary_stream_url:s.primary_stream_url||'',low_data_stream_url:s.low_data_stream_url||'',stream_enabled:s.stream_enabled,donation_url:s.donation_url||''})}).catch(()=>setError('loadError'));return()=>{active=false}},[])
 const save=async(e:FormEvent)=>{e.preventDefault();if(busy)return;setError('');setNotice('');setBusy(true);try{await api('station.update',form);setNotice('stationSaved');onSaved()}catch(e){setError(errorKey(e))}finally{setBusy(false)}}
 return <form className="native-form settings-form" onSubmit={save}><Field label={t('primaryStream')} type="url" value={form.primary_stream_url} disabled={busy} maxLength={2048} onChange={e=>setForm({...form,primary_stream_url:e.target.value})}/><Field label={t('lowDataStream')} type="url" value={form.low_data_stream_url} disabled={busy} maxLength={2048} onChange={e=>setForm({...form,low_data_stream_url:e.target.value})}/><label className="check-field"><input type="checkbox" checked={form.stream_enabled} disabled={busy||!form.primary_stream_url} onChange={e=>setForm({...form,stream_enabled:e.target.checked})}/>{t('streamEnabled')}</label><Field label={t('donationUrl')} type="url" value={form.donation_url} disabled={busy} maxLength={2048} onChange={e=>setForm({...form,donation_url:e.target.value})}/><button className="button" disabled={busy}>{t(busy?'saving':'updateStation')}</button>{error&&<p role="alert" className="field-error">{t(error)}</p>}{notice&&<p role="status">{t(notice)}</p>}</form>
}
