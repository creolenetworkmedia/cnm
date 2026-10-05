import {describe,it,expect} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import {LocaleProvider} from '../../src/shared/i18n'
import {RouterProvider} from '../../src/app/router'
import {HomePage} from '../../src/features/articles/HomePage'
import {LanguageMenu} from '../../src/features/navigation/LanguageMenu'
import {VideoEmbed} from '../../src/features/media/VideoEmbed'
const wrap = (child: React.ReactNode) => <LocaleProvider><RouterProvider>{child}</RouterProvider></LocaleProvider>
describe('publication',()=>{
 it('uses station information and participation without invented reporting when empty',()=>{
   render(wrap(<HomePage articles={[]} programs={[]} loading={false} error={false} onRetry={()=>{}} />))
   expect(screen.getByRole('heading',{name:'Creole Network Media'})).toBeInTheDocument()
   expect(screen.getAllByRole('link',{name:/Request a song/i})[0]).toHaveAttribute('href','/community?form=song')
   expect(screen.queryByText(/No stories have been published/)).not.toBeInTheDocument()
   expect(screen.getAllByRole('link',{name:/Partner with CNM/i}).length).toBeGreaterThan(0)
 })
 it('switches a compact language menu to Haitian Creole',()=>{
   localStorage.clear();render(wrap(<LanguageMenu />))
   fireEvent.click(screen.getByRole('button',{name:'Choose your language'}))
   fireEvent.click(screen.getByRole('radio',{name:/Krey/}))
   expect(document.documentElement.lang).toBe('ht')
   expect(localStorage.getItem('cnm-locale')).toBe('ht')
   localStorage.clear()
 })
 it('does not request a video iframe before the reader activates it',()=>{
   const {container}=render(wrap(<VideoEmbed video={{provider:'youtube',videoId:'dQw4w9WgXcQ'}} />))
   expect(container.querySelector('iframe')).toBeNull()
   fireEvent.click(screen.getByRole('button',{name:'Play video'}))
   expect(container.querySelector('iframe')?.src).toContain('youtube-nocookie.com/embed/')
   expect(container.querySelector('iframe')?.src).not.toContain('autoplay=1')
 })
})
