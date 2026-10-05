import type {ScheduleSlot} from '../../data'
export type Slot = ScheduleSlot & {effective_from?:string|null;effective_to?:string|null}
function localParts(instant:Date,timezone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant)
 const get=(type:string)=>parts.find(p=>p.type===type)?.value||''
 return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`}
}
function utcCandidates(date:string,time:string,timezone:string):number[]{
 const base=Date.parse(date+'T'+time.slice(0,5)+':00Z'); if(!Number.isFinite(base))return []
 const offsets=new Set<number>()
 for(const shift of [-86400000,-21600000,0,21600000,86400000]){
  const probe=base+shift, p=localParts(new Date(probe),timezone)
  offsets.add(Date.parse(p.date+'T'+p.time+':00Z')-probe)
 }
 return [...offsets].map(offset=>base-offset).filter(candidate=>{const p=localParts(new Date(candidate),timezone);return p.date===date&&p.time===time.slice(0,5)})
}
export function resolveProgram(slots:Slot[],instant:Date):{current:Slot|null;ambiguous:boolean}{
 const matches:Slot[]=[],now=instant.getTime();let ambiguous=false
 if(!Number.isFinite(now))return {current:null,ambiguous:false}
 for(const slot of slots){
  if(!slot.is_active||slot.duration_minutes<1||slot.duration_minutes>1440||!/^\d{2}:\d{2}/.test(slot.start_time))continue
  try{
   const today=localParts(instant,slot.timezone).date
   for(const delta of [0,-1]){
    const day=new Date(Date.parse(today+'T12:00:00Z')+delta*86400000),date=day.toISOString().slice(0,10)
    if(day.getUTCDay()!==slot.day_of_week||(slot.effective_from&&date<slot.effective_from)||(slot.effective_to&&date>slot.effective_to))continue
    const candidates=utcCandidates(date,slot.start_time,slot.timezone)
    if(candidates.some(start=>now>=start&&now<start+slot.duration_minutes*60000)){
      if(candidates.length>1)ambiguous=true;else matches.push(slot)
    }
   }
  }catch{/* Invalid timezones and dates must not invent current programming. */}
 }
 return {current:!ambiguous&&matches.length===1?matches[0]:null,ambiguous:ambiguous||matches.length>1}
}
export function dayLabel(day:number,locale:string):string{if(locale==='ht')return ['Dimanch','Lendi','Madi','M\u00e8kredi','Jedi','Vandredi','Samdi'][day]||'';return new Intl.DateTimeFormat(locale==='ht'?'fr-HT':locale,{weekday:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0,4+day)))}
