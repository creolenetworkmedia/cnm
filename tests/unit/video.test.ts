import {describe,it,expect} from 'vitest'
import {normalizeVideoUrl,videoEmbedUrl} from '../../src/shared/media/video'
describe('external video validation',()=>{
 it('normalizes public HTTPS providers',()=>{
  expect(normalizeVideoUrl('https://youtu.be/Abcdef12_-3')).toEqual({provider:'youtube',videoId:'Abcdef12_-3'})
  expect(normalizeVideoUrl('https://www.youtube.com/watch?v=Abcdef12_-3')).toEqual({provider:'youtube',videoId:'Abcdef12_-3'})
  expect(normalizeVideoUrl('https://vimeo.com/123456789')).toEqual({provider:'vimeo',videoId:'123456789'})
 })
 it('rejects spoofed hosts, script markup, credentials, unlisted tokens and malformed IDs',()=>{
  for(const v of ['javascript:alert(1)','<iframe src="https://youtube.com"></iframe>','https://youtube.com.evil.test/watch?v=Abcdef12_-3','https://evil.test/youtu.be/Abcdef12_-3','http://youtu.be/Abcdef12_-3','https://user:pass@youtube.com/watch?v=Abcdef12_-3','https://vimeo.com/123456789/deadbeef','https://vimeo.com/123456789?h=deadbeef','https://youtube.com/watch?v=short']) expect(normalizeVideoUrl(v)).toBeNull()
 })
 it('uses a fixed privacy-oriented player without autoplay',()=>{
  expect(videoEmbedUrl({provider:'youtube',videoId:'Abcdef12_-3'})).toContain('youtube-nocookie.com/embed/Abcdef12_-3')
  expect(videoEmbedUrl({provider:'vimeo',videoId:'123456789'})).toContain('player.vimeo.com/video/123456789')
  expect(videoEmbedUrl({provider:'youtube',videoId:'Abcdef12_-3'})).not.toContain('autoplay=1')
 })
})
