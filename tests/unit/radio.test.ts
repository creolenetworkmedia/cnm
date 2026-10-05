import {describe,it,expect} from 'vitest'
import {reduceRadio,selectStream} from '../../src/features/radio/radio.machine'
describe('truthful radio state',()=>{
 it('stays off air when disabled or no URL is configured',()=>{
  expect(selectStream({stream_enabled:false,primary_stream_url:'https://radio.test/live'},false)).toBeNull()
  expect(selectStream({stream_enabled:true,primary_stream_url:null},true)).toBeNull()
  expect(reduceRadio('idle',{type:'UNAVAILABLE'})).toBe('off-air')
 })
 it('separates connecting, playing, paused, failed and offline states',()=>{
  expect(reduceRadio('idle',{type:'PLAY'})).toBe('connecting')
  expect(reduceRadio('connecting',{type:'PLAYING'})).toBe('playing')
  expect(reduceRadio('playing',{type:'PAUSE'})).toBe('paused')
  expect(reduceRadio('connecting',{type:'TIMEOUT'})).toBe('failed')
  expect(reduceRadio('playing',{type:'OFFLINE'})).toBe('offline')
  expect(reduceRadio('failed',{type:'PLAY'})).toBe('connecting')
 })
 it('uses a lower-data URL only when one is actually supplied',()=>{
  const c={stream_enabled:true,primary_stream_url:'https://radio.test/live',low_data_stream_url:null}
  expect(selectStream(c,true)).toBe(c.primary_stream_url)
  expect(selectStream({...c,low_data_stream_url:'https://radio.test/low'},true)).toBe('https://radio.test/low')
  expect(selectStream({...c,primary_stream_url:'javascript:alert(1)'},false)).toBeNull()
 })
})
