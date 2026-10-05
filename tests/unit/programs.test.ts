import {describe,it,expect} from 'vitest'
import {resolveProgram} from '../../src/features/programs/programs.model'
const slot={id:'x',show_id:'s',day_of_week:0,start_time:'23:30:00',duration_minutes:120,timezone:'America/New_York',is_active:true}
describe('program resolution',()=>{
 it('includes an overnight program using the station date',()=>expect(resolveProgram([slot],new Date('2026-10-05T04:30:00Z')).current?.id).toBe('x'))
 it('honors effective dates and rejects invalid timezones',()=>{expect(resolveProgram([{...slot,effective_to:'2026-09-01'}],new Date('2026-10-05T04:30:00Z')).current).toBeNull();expect(resolveProgram([{...slot,timezone:'Bad/Zone'}],new Date()).current).toBeNull()})
 it('does not invent a current show for overlapping schedules',()=>expect(resolveProgram([slot,{...slot,id:'y'}],new Date('2026-10-05T04:30:00Z'))).toEqual({current:null,ambiguous:true}))
 it('does not assert a nonexistent spring DST start',()=>expect(resolveProgram([{...slot,start_time:'02:30:00'}],new Date('2026-03-08T07:10:00Z')).current).toBeNull())
 it('identifies a repeated fall DST start as ambiguous',()=>expect(resolveProgram([{...slot,start_time:'01:15:00',duration_minutes:90}],new Date('2026-11-01T06:30:00Z')).ambiguous).toBe(true))
})
