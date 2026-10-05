import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  FileText,
  Heart,
  Menu,
  Music2,
  Pause,
  Play,
  Send,
  Share2,
  X,
} from 'lucide-react'
import { localeNames, localized, textFor, type Locale } from './i18n'
import {
  deleteArticle,
  getAdminArticles,
  getArticleBySlug,
  getCategories,
  getProfile,
  getPublicMediaUrl,
  getPublishedArticles,
  getSchedule,
  getStation,
  isCurrentUserAdmin,
  saveArticle,
  submitDedication,
  submitSongRequest,
  submitStory,
  updateProfile,
  updateStation,
  uploadArticleImage,
  type Article,
  type ArticleCategory,
  type ArticleEditorValue,
  type ScheduleSlot,
  type StationConfig,
} from './data'
import { supabase } from './supabase'

type Route =
  | { page: 'home' }
  | { page: 'listen' }
  | { page: 'news' }
  | { page: 'article'; slug: string }
  | { page: 'programs' }
  | { page: 'community' }
  | { page: 'support' }
  | { page: 'about' }
  | { page: 'account' }
  | { page: 'admin' }

const localeOrder: Locale[] = ['en', 'fr', 'ht', 'es']
const dayNames: Record<Locale, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  ht: ['Dimanch', 'Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
}

function routeFromPath(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/listen') return { page: 'listen' }
  if (path === '/news') return { page: 'news' }
  if (path.startsWith('/news/')) return { page: 'article', slug: decodeURIComponent(path.slice(6)) }
  if (path === '/programs') return { page: 'programs' }
  if (path === '/community') return { page: 'community' }
  if (path === '/support') return { page: 'support' }
  if (path === '/about') return { page: 'about' }
  if (path === '/account') return { page: 'account' }
  if (path === '/admin') return { page: 'admin' }
  return { page: 'home' }
}

function useRoute() {
  const [route, setRoute] = useState<Route>(() => routeFromPath())
  useEffect(() => {
    const onPop = () => setRoute(routeFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = (path: string) => {
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setRoute(routeFromPath())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return { route, go }
}

function fmtDate(value: string | null, locale: Locale) {
  if (!value) return ''
  return new Intl.DateTimeFormat(locale === 'ht' ? 'fr-HT' : locale, { dateStyle: 'medium' }).format(new Date(value))
}

function fmtTime(value: string) {
  const [hourText, minute] = value.split(':')
  const hour = Number(hourText)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:${minute} ${suffix}`
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

function App() {
  const { route, go } = useRoute()
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('cnm-locale') as Locale) || 'en')
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [station, setStation] = useState<StationConfig | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'error'>('idle')

  const t = (key: string) => textFor(locale, key)

  useEffect(() => {
    localStorage.setItem('cnm-locale', locale)
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    let mounted = true
    Promise.allSettled([getStation(), getPublishedArticles(30), getSchedule()]).then((results) => {
      if (!mounted) return
      if (results[0].status === 'fulfilled') setStation(results[0].value)
      if (results[1].status === 'fulfilled') setArticles(results[1].value)
      if (results[2].status === 'fulfilled') setSchedule(results[2].value)
      setLoading(false)
    })
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: auth } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => {
      mounted = false
      auth.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      return
    }
    isCurrentUserAdmin().then(setIsAdmin)
  }, [session])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => { setPlaying(true); setAudioState('idle') }
    const onPause = () => setPlaying(false)
    const onWaiting = () => setAudioState('loading')
    const onCanPlay = () => setAudioState('idle')
    const onError = () => { setPlaying(false); setAudioState('error') }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
    }
  }, [])

  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
  const streamUrl = station?.stream_enabled
    ? (saveData && station.low_data_stream_url ? station.low_data_stream_url : station.primary_stream_url)
    : null

  const toggleAudio = async () => {
    if (!streamUrl || !audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      return
    }
    setAudioState('loading')
    if (audioRef.current.src !== streamUrl) audioRef.current.src = streamUrl
    try {
      await audioRef.current.play()
    } catch {
      setAudioState('error')
    }
  }

  const refreshContent = async () => {
    const [nextStation, nextArticles, nextSchedule] = await Promise.all([getStation(), getPublishedArticles(30), getSchedule()])
    setStation(nextStation)
    setArticles(nextArticles)
    setSchedule(nextSchedule)
  }

  return (
    <div className="app-shell">
      <audio ref={audioRef} preload="none" />
      <SiteHeader locale={locale} setLocale={setLocale} route={route} go={go} isAdmin={isAdmin} session={session} t={t} />
      <main>
        {route.page === 'home' && <HomePage locale={locale} t={t} station={station} articles={articles} schedule={schedule} loading={loading} go={go} playing={playing} audioState={audioState} toggleAudio={toggleAudio} />}
        {route.page === 'listen' && <ListenPage locale={locale} t={t} station={station} schedule={schedule} playing={playing} audioState={audioState} toggleAudio={toggleAudio} />}
        {route.page === 'news' && <NewsPage locale={locale} t={t} articles={articles} go={go} isAdmin={isAdmin} />}
        {route.page === 'article' && <ArticlePage locale={locale} t={t} slug={route.slug} go={go} cached={articles} />}
        {route.page === 'programs' && <ProgramsPage locale={locale} t={t} schedule={schedule} />}
        {route.page === 'community' && <CommunityPage locale={locale} t={t} session={session} go={go} />}
        {route.page === 'support' && <SupportPage t={t} station={station} />}
        {route.page === 'about' && <AboutPage t={t} />}
        {route.page === 'account' && <AccountPage locale={locale} setLocale={setLocale} t={t} session={session} />}
        {route.page === 'admin' && <AdminPage locale={locale} t={t} session={session} isAdmin={isAdmin} station={station} refreshContent={refreshContent} />}
      </main>
      {route.page !== 'admin' && <SiteFooter t={t} go={go} />}
      {playing && <MiniPlayer t={t} station={station} playing={playing} toggleAudio={toggleAudio} />}
    </div>
  )
}

function SiteHeader({ locale, setLocale, route, go, isAdmin, session, t }: { locale: Locale; setLocale: (l: Locale) => void; route: Route; go: (p: string) => void; isAdmin: boolean; session: Session | null; t: (k: string) => string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const links = [
    ['/listen', t('listen')], ['/news', t('news')], ['/programs', t('programs')], ['/community', t('community')], ['/about', t('about')],
  ] as const
  const activePath = route.page === 'article' ? '/news' : `/${route.page === 'home' ? '' : route.page}`

  return <>
    <header className="site-header">
      <div className="header-inner">
        <button className="brand-button" onClick={() => go('/')} aria-label={t('home')}><img src="/cnm-mark.svg" alt="Creole Network Media" /></button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([path, label]) => <button key={path} className={activePath === path ? 'nav-link active' : 'nav-link'} onClick={() => go(path)}>{label}</button>)}
        </nav>
        <div className="header-actions">
          {isAdmin && <button className="editorial-link" onClick={() => go('/admin')}>{t('admin')}</button>}
          <div className="language-wrap">
            <button className="language-trigger" onClick={() => setLangOpen((v) => !v)} aria-expanded={langOpen}><span>{locale.toUpperCase()}</span><ChevronDown size={15} strokeWidth={1.8} /></button>
            {langOpen && <div className="language-menu">
              {localeOrder.map((code) => <button key={code} onClick={() => { setLocale(code); setLangOpen(false) }} className={code === locale ? 'selected' : ''}><span>{localeNames[code]}</span><span>{code.toUpperCase()}</span></button>)}
            </div>}
          </div>
          <button className="icon-button account-icon" onClick={() => go('/account')} aria-label={t('account')}><CircleUserRound size={23} strokeWidth={1.8} /><span className="desktop-only">{session ? t('account') : t('signIn')}</span></button>
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label={t('menu')}><Menu size={25} /></button>
        </div>
      </div>
    </header>
    {menuOpen && <div className="mobile-drawer">
      <div className="drawer-top"><img src="/cnm-mark.svg" alt="CNM" /><button className="icon-button" onClick={() => setMenuOpen(false)} aria-label={t('close')}><X size={26} /></button></div>
      <nav>{links.map(([path, label]) => <button key={path} onClick={() => { go(path); setMenuOpen(false) }}>{label}</button>)}{isAdmin && <button onClick={() => { go('/admin'); setMenuOpen(false) }}>{t('admin')}</button>}<button onClick={() => { go('/account'); setMenuOpen(false) }}>{t('account')}</button></nav>
    </div>}
  </>
}

function HomePage({ locale, t, station, articles, schedule, loading, go, playing, audioState, toggleAudio }: { locale: Locale; t: (k: string) => string; station: StationConfig | null; articles: Article[]; schedule: ScheduleSlot[]; loading: boolean; go: (p: string) => void; playing: boolean; audioState: string; toggleAudio: () => void }) {
  return <>
    <section className="home-hero section-pad">
      <div className="hero-copy">
        <div className="eyebrow">{t('radioNewsCulture')}</div>
        <h1>{t('homeTitle')}</h1>
        <p>{t('homeBody')}</p>
        <div className="hero-links"><button className="primary-btn" onClick={() => go('/listen')}>{t('listenLive')}</button><button className="text-btn" onClick={() => go('/news')}>{t('latestStories')} <span>→</span></button></div>
      </div>
      <LivePanel station={station} t={t} playing={playing} audioState={audioState} toggleAudio={toggleAudio} />
    </section>
    <section className="editorial-section section-pad">
      <SectionHeading title={t('latestStories')} action={t('allNews')} onAction={() => go('/news')} />
      {loading ? <LoadingLines /> : articles.length ? <ArticleGrid articles={articles.slice(0, 5)} locale={locale} go={go} /> : <EmptyEditorial text={t('noStories')} />}
    </section>
    <section className="program-strip section-pad">
      <SectionHeading title={t('todayPrograms')} action={t('programs')} onAction={() => go('/programs')} />
      <SchedulePreview schedule={schedule} locale={locale} empty={t('noPrograms')} />
    </section>
    <section className="community-band section-pad">
      <div><div className="eyebrow light">CNM</div><h2>{t('communityTitle')}</h2><p>{t('communityBody')}</p></div>
      <button className="light-btn" onClick={() => go('/community')}>{t('community')} <span>→</span></button>
    </section>
  </>
}

function LivePanel({ station, t, playing, audioState, toggleAudio }: { station: StationConfig | null; t: (k: string) => string; playing: boolean; audioState: string; toggleAudio: () => void }) {
  const available = Boolean(station?.stream_enabled && station.primary_stream_url)
  return <div className="live-panel">
    <div className="live-panel-top"><span className={available ? 'live-dot' : 'status-dot off'} /><span>{available ? t('onAir') : t('offAir')}</span></div>
    <div className="live-panel-content">
      <button className="play-button" onClick={toggleAudio} disabled={!available} aria-label={playing ? t('pause') : t('play')}>{playing ? <Pause size={28} fill="currentColor" /> : <Play size={30} fill="currentColor" />}</button>
      <div><span className="station-kicker">{station?.short_name || 'CNM'} RADIO</span><h2>{station?.station_name || 'Creole Network Media'}</h2><p>{!available ? t('unavailable') : audioState === 'loading' ? t('loadingStream') : playing ? t('liveNow') : t('listenLive')}</p></div>
    </div>
    <div className="signal-bars" aria-hidden="true">{Array.from({ length: 26 }).map((_, i) => <span key={i} style={{ height: `${12 + ((i * 17) % 38)}px` }} />)}</div>
  </div>
}

function ListenPage({ locale, t, station, schedule, playing, audioState, toggleAudio }: { locale: Locale; t: (k: string) => string; station: StationConfig | null; schedule: ScheduleSlot[]; playing: boolean; audioState: string; toggleAudio: () => void }) {
  return <div className="page-wrap listen-page">
    <div className="listen-stage">
      <div className="listen-brand"><img src="/cnm-mark-white.svg" alt="CNM" /><span className={station?.stream_enabled ? 'live-label' : 'off-label'}>{station?.stream_enabled ? t('liveNow') : t('offAir')}</span></div>
      <div className="listen-center"><button className="listen-play" onClick={toggleAudio} disabled={!station?.stream_enabled || !station.primary_stream_url}>{playing ? <Pause size={45} fill="currentColor" /> : <Play size={48} fill="currentColor" />}</button><h1>{station?.station_name || 'Creole Network Media'}</h1><p>{station?.stream_enabled && station.primary_stream_url ? (audioState === 'loading' ? t('loadingStream') : t('radioNewsCulture')) : t('unavailable')}</p></div>
      <div className="listen-wave">{Array.from({ length: 44 }).map((_, i) => <span key={i} style={{ height: `${8 + ((i * 23) % 50)}px` }} />)}</div>
    </div>
    <section className="content-column section-pad compact-top"><SectionHeading title={t('todayPrograms')} /><SchedulePreview schedule={schedule} locale={locale} empty={t('noPrograms')} /></section>
  </div>
}

function NewsPage({ locale, t, articles, go, isAdmin }: { locale: Locale; t: (k: string) => string; articles: Article[]; go: (p: string) => void; isAdmin: boolean }) {
  return <div className="page-wrap section-pad">
    <div className="page-title-row"><div><div className="eyebrow">CNM EDITORIAL</div><h1>{t('news')}</h1></div>{isAdmin && <button className="text-btn" onClick={() => go('/admin')}>{t('newArticle')} <span>+</span></button>}</div>
    {articles.length ? <ArticleGrid articles={articles} locale={locale} go={go} full /> : <EmptyEditorial text={t('noStories')} />}
  </div>
}

function ArticleGrid({ articles, locale, go, full = false }: { articles: Article[]; locale: Locale; go: (p: string) => void; full?: boolean }) {
  return <div className={full ? 'article-grid full' : 'article-grid'}>{articles.map((article, index) => {
    const img = getPublicMediaUrl(article.hero)
    return <article className={index === 0 && !full ? 'story-card lead' : 'story-card'} key={article.id} onClick={() => go(`/news/${encodeURIComponent(article.slug)}`)}>
      <div className="story-image">{img ? <img src={img} alt={localized(article.hero?.alt_i18n, locale) || localized(article.title_i18n, locale)} loading="lazy" /> : <div className="story-placeholder"><img src="/cnm-mark.svg" alt="" /></div>}</div>
      <div className="story-meta"><span>{localized(article.category?.name_i18n, locale) || 'CNM'}</span><span>{fmtDate(article.published_at, locale)}</span></div>
      <h2>{localized(article.title_i18n, locale)}</h2>
      <p>{localized(article.excerpt_i18n, locale)}</p>
    </article>
  })}</div>
}

function ArticlePage({ locale, t, slug, go, cached }: { locale: Locale; t: (k: string) => string; slug: string; go: (p: string) => void; cached: Article[] }) {
  const [article, setArticle] = useState<Article | null | undefined>(() => cached.find((x) => x.slug === slug))
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!article) getArticleBySlug(slug).then(setArticle).catch(() => setArticle(null)) }, [slug])
  if (article === undefined) return <div className="page-wrap section-pad"><LoadingLines /></div>
  if (!article) return <div className="page-wrap section-pad"><button className="back-link" onClick={() => go('/news')}><ArrowLeft size={17} /> {t('backToNews')}</button><EmptyEditorial text={t('noStories')} /></div>
  const img = getPublicMediaUrl(article.hero)
  const body = localized(article.body_i18n, locale)
  const share = async () => {
    const url = window.location.href
    if (navigator.share) await navigator.share({ title: localized(article.title_i18n, locale), url })
    else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }
  return <article className="article-page page-wrap">
    <div className="article-header section-pad"><button className="back-link" onClick={() => go('/news')}><ArrowLeft size={17} /> {t('backToNews')}</button><div className="article-category">{localized(article.category?.name_i18n, locale) || 'CNM'}</div><h1>{localized(article.title_i18n, locale)}</h1><p className="article-dek">{localized(article.excerpt_i18n, locale)}</p><div className="article-byline"><span>{fmtDate(article.published_at, locale)}</span><button onClick={share}><Share2 size={17} /> {copied ? t('copied') : t('share')}</button></div></div>
    {img && <div className="article-hero"><img src={img} alt={localized(article.hero?.alt_i18n, locale) || localized(article.title_i18n, locale)} /></div>}
    <div className="article-body">{body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
  </article>
}

function ProgramsPage({ locale, t, schedule }: { locale: Locale; t: (k: string) => string; schedule: ScheduleSlot[] }) {
  const grouped = useMemo(() => dayNames[locale].map((name, day) => ({ name, items: schedule.filter((x) => x.day_of_week === day) })).filter((x) => x.items.length), [schedule, locale])
  return <div className="page-wrap section-pad"><div className="eyebrow">CNM RADIO</div><h1 className="page-title">{t('programs')}</h1>{grouped.length ? <div className="schedule-full">{grouped.map((group) => <section key={group.name}><h2>{group.name}</h2>{group.items.map((slot) => <div className="schedule-row" key={slot.id}><time>{fmtTime(slot.start_time)}</time><div><strong>{slot.show?.title}</strong><span>{localized(slot.show?.description_i18n, locale)}</span></div><span className="duration">{slot.duration_minutes} min</span></div>)}</section>)}</div> : <EmptyEditorial text={t('noPrograms')} />}</div>
}

function CommunityPage({ locale, t, session, go }: { locale: Locale; t: (k: string) => string; session: Session | null; go: (p: string) => void }) {
  const [open, setOpen] = useState<'song' | 'dedication' | 'story' | null>(null)
  return <div className="page-wrap section-pad"><div className="eyebrow">CNM COMMUNITY</div><h1 className="page-title">{t('communityTitle')}</h1><p className="page-intro">{t('communityBody')}</p><div className="community-list">
    <CommunityRow icon={<Music2 />} title={t('requestSong')} body={t('requestSongBody')} onClick={() => setOpen('song')} />
    <CommunityRow icon={<Heart />} title={t('dedication')} body={t('dedicationBody')} onClick={() => setOpen('dedication')} />
    <CommunityRow icon={<FileText />} title={t('submitArticle')} body={t('submitArticleBody')} onClick={() => setOpen('story')} />
    <CommunityRow icon={<Send />} title={t('supportCnm')} body={t('supportBody')} onClick={() => go('/support')} />
  </div>{open && <SubmissionDialog kind={open} locale={locale} t={t} session={session} close={() => setOpen(null)} go={go} />}</div>
}

function CommunityRow({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick: () => void }) {
  return <button className="community-row" onClick={onClick}><span className="community-icon">{icon}</span><span><strong>{title}</strong><small>{body}</small></span><span className="row-arrow">→</span></button>
}

function SubmissionDialog({ kind, locale, t, session, close, go }: { kind: 'song' | 'dedication' | 'story'; locale: Locale; t: (k: string) => string; session: Session | null; close: () => void; go: (p: string) => void }) {
  const [form, setForm] = useState({ name: '', title: '', artist: '', message: '', recipient: '', body: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session) return
    setState('sending'); setError('')
    try {
      if (kind === 'song') await submitSongRequest(session.user, locale, form)
      if (kind === 'dedication') await submitDedication(session.user, locale, form)
      if (kind === 'story') await submitStory(session.user, locale, { name: form.name, title: form.title, body: form.body })
      setState('done')
    } catch (e: any) { setError(e.message || 'Unable to submit'); setState('idle') }
  }
  return <div className="modal-backdrop" onMouseDown={close}><div className="form-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><h2>{kind === 'song' ? t('requestSong') : kind === 'dedication' ? t('dedication') : t('submitArticle')}</h2><button className="icon-button" onClick={close}><X /></button></div>
    {!session ? <div className="auth-required"><h3>{t('signInRequired')}</h3><p>{t('signInBody')}</p><button className="primary-btn" onClick={() => { close(); go('/account') }}>{t('signIn')}</button></div> : state === 'done' ? <div className="success-state"><div className="success-mark">✓</div><h3>{t('submitted')}</h3><button className="text-btn" onClick={close}>{t('close')}</button></div> : <form className="native-form" onSubmit={submit}>
      <Field label={t('name')} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
      {kind === 'song' && <><Field label={t('songTitle')} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required /><Field label={t('artist')} value={form.artist} onChange={(v) => setForm({ ...form, artist: v })} /><TextArea label={t('message')} value={form.message} onChange={(v) => setForm({ ...form, message: v })} /></>}
      {kind === 'dedication' && <><Field label={t('recipient')} value={form.recipient} onChange={(v) => setForm({ ...form, recipient: v })} required /><TextArea label={t('message')} value={form.message} onChange={(v) => setForm({ ...form, message: v })} required /><Field label={t('songTitle')} value={form.title} onChange={(v) => setForm({ ...form, title: v })} /><Field label={t('artist')} value={form.artist} onChange={(v) => setForm({ ...form, artist: v })} /></>}
      {kind === 'story' && <><Field label={t('title')} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required /><TextArea label={t('story')} value={form.body} onChange={(v) => setForm({ ...form, body: v })} required tall /></>}
      {error && <p className="form-error">{error}</p>}<button className="primary-btn full-width" disabled={state === 'sending'}>{state === 'sending' ? t('sending') : t('send')}</button>
    </form>}
  </div></div>
}

function SupportPage({ t, station }: { t: (k: string) => string; station: StationConfig | null }) {
  const usable = station?.donation_url && !station.donation_url.includes('creolenetworkmedia.com/support')
  return <div className="page-wrap section-pad support-page"><div className="eyebrow">CNM COMMUNITY</div><h1>{t('supportCnm')}</h1><p className="page-intro">{t('supportBody')}</p><div className="support-block"><div className="support-number">01</div><div><h2>{t('supportCnm')}</h2><p>{usable ? t('supportBody') : t('supportUnavailable')}</p>{usable ? <a className="primary-btn inline" href={station!.donation_url!} target="_blank" rel="noreferrer">{t('supportCnm')}</a> : <a className="primary-btn inline" href="mailto:creolenetworkmedia@gmail.com">{t('contactCnm')}</a>}</div></div></div>
}

function AboutPage({ t }: { t: (k: string) => string }) {
  return <div className="page-wrap section-pad about-page"><div className="eyebrow">CNM</div><h1>{t('aboutTitle')}</h1><p className="about-lead">{t('aboutBody')}</p><div className="brand-principles"><div><strong>{t('aboutRadio')}</strong><span>{t('aboutRadioBody')}</span></div><div><strong>{t('aboutNews')}</strong><span>{t('aboutNewsBody')}</span></div><div><strong>{t('aboutCulture')}</strong><span>{t('aboutCultureBody')}</span></div><div><strong>{t('aboutCommunity')}</strong><span>{t('aboutCommunityBody')}</span></div></div></div>
}

function AccountPage({ locale, setLocale, t, session }: { locale: Locale; setLocale: (l: Locale) => void; t: (k: string) => string; session: Session | null }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [profileName, setProfileName] = useState('')
  useEffect(() => { if (session) getProfile(session.user.id).then((p) => { setProfileName(p?.display_name || ''); if (p?.preferred_language) setLocale(p.preferred_language) }).catch(() => {}) }, [session])
  const authSubmit = async (e: FormEvent) => {
    e.preventDefault(); setMessage('')
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setMessage(error ? error.message : '')
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name, preferred_language: locale }, emailRedirectTo: 'https://creolenetworkmedia.com/account' } })
      setMessage(error ? error.message : t('checkEmail'))
    }
  }
  const saveProfile = async () => {
    if (!session) return
    try { await updateProfile(session.user.id, { display_name: profileName, preferred_language: locale }); setMessage(t('saved')) } catch (e: any) { setMessage(e.message) }
  }
  if (!session) return <div className="page-wrap section-pad account-page"><div className="auth-layout"><div><div className="eyebrow">CNM ACCOUNT</div><h1>{mode === 'signin' ? t('signIn') : t('createAccount')}</h1><p>{t('signInBody')}</p></div><form className="native-form auth-form" onSubmit={authSubmit}>{mode === 'signup' && <Field label={t('displayName')} value={name} onChange={setName} required />}<Field label={t('email')} type="email" value={email} onChange={setEmail} required /><Field label={t('password')} type="password" value={password} onChange={setPassword} required />}{message && <p className="form-message">{message}</p>}<button className="primary-btn full-width">{mode === 'signin' ? t('signIn') : t('createAccount')}</button><button type="button" className="text-btn auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>{mode === 'signin' ? t('createAccount') : t('signIn')}</button></form></div></div>
  return <div className="page-wrap section-pad account-page"><div className="page-title-row"><div><div className="eyebrow">CNM ACCOUNT</div><h1>{t('profileTitle')}</h1></div><button className="text-btn" onClick={() => supabase.auth.signOut()}>{t('signOut')}</button></div><div className="settings-sheet"><div className="setting-row"><div><strong>{t('email')}</strong><span>{session.user.email}</span></div></div><div className="setting-row"><div><strong>{t('displayName')}</strong></div><input value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div><div className="setting-row"><div><strong>{t('preferredLanguage')}</strong></div><select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>{localeOrder.map((l) => <option key={l} value={l}>{localeNames[l]}</option>)}</select></div><div className="settings-actions"><button className="primary-btn" onClick={saveProfile}>{t('save')}</button>{message && <span>{message}</span>}</div></div></div>
}

function AdminPage({ locale, t, session, isAdmin, station, refreshContent }: { locale: Locale; t: (k: string) => string; session: Session | null; isAdmin: boolean; station: StationConfig | null; refreshContent: () => Promise<void> }) {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<ArticleCategory[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [tab, setTab] = useState<'articles' | 'station'>('articles')
  const [status, setStatus] = useState('')
  const load = async () => { if (!isAdmin) return; const [a, c] = await Promise.all([getAdminArticles(), getCategories()]); setArticles(a); setCategories(c) }
  useEffect(() => { load().catch((e) => setStatus(e.message)) }, [isAdmin])
  if (!session) return <div className="admin-shell"><div className="admin-gate"><img src="/cnm-mark.svg" alt="CNM" /><h1>{t('signInRequired')}</h1><p>{t('editorialBody')}</p><a className="primary-btn inline" href="/account">{t('signIn')}</a></div></div>
  if (!isAdmin) return <div className="admin-shell"><div className="admin-gate"><img src="/cnm-mark.svg" alt="CNM" /><h1>{t('adminOnly')}</h1><p>{t('notAdmin')}</p></div></div>
  return <div className="admin-shell"><aside className="admin-sidebar"><img src="/cnm-mark-white.svg" alt="CNM" /><span>EDITORIAL</span><nav><button className={tab === 'articles' ? 'active' : ''} onClick={() => setTab('articles')}><FileText size={18} /> {t('news')}</button><button className={tab === 'station' ? 'active' : ''} onClick={() => setTab('station')}><Bell size={18} /> {t('streamSettings')}</button></nav><a href="/">← {t('home')}</a></aside><div className="admin-main"><div className="admin-top"><div><div className="eyebrow">CNM</div><h1>{tab === 'articles' ? t('editorialTitle') : t('streamSettings')}</h1></div>{tab === 'articles' && <button className="primary-btn" onClick={() => setSelected(emptyArticle())}>+ {t('newArticle')}</button>}</div>{status && <div className="admin-notice">{status}</div>}{tab === 'articles' ? <><div className="admin-article-list">{articles.map((a) => <button key={a.id} onClick={() => setSelected(a)}><div><span>{localized(a.category?.name_i18n, locale) || 'CNM'}</span><strong>{localized(a.title_i18n, locale) || localized(a.title_i18n, 'en') || a.slug}</strong></div><small>{t(a.status)} · {fmtDate(a.published_at || a.updated_at, locale)}</small></button>)}</div>{selected && <ArticleEditor article={selected} categories={categories} locale={locale} t={t} session={session} close={() => setSelected(null)} onSaved={async () => { setSelected(null); await load(); await refreshContent(); setStatus(t('articleSaved')); setTimeout(() => setStatus(''), 1800) }} />}</> : <StationEditor station={station} t={t} onSaved={async () => { await refreshContent(); setStatus(t('stationSaved')); setTimeout(() => setStatus(''), 1800) }} />}</div></div>
}

function emptyArticle(): Article {
  const now = new Date().toISOString()
  return { id: '', slug: '', category_id: null, title_i18n: {}, excerpt_i18n: {}, body_i18n: {}, hero_media_id: null, author_user_id: null, status: 'draft', scheduled_for: null, published_at: null, created_at: now, updated_at: now }
}

function ArticleEditor({ article, categories, locale, t, session, close, onSaved }: { article: Article; categories: ArticleCategory[]; locale: Locale; t: (k: string) => string; session: Session; close: () => void; onSaved: () => Promise<void> }) {
  const [editLocale, setEditLocale] = useState<Locale>(locale)
  const [value, setValue] = useState<ArticleEditorValue>({ id: article.id || undefined, slug: article.slug, category_id: article.category_id, title_i18n: { ...article.title_i18n }, excerpt_i18n: { ...article.excerpt_i18n }, body_i18n: { ...article.body_i18n }, hero_media_id: article.hero_media_id, status: article.status })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState(getPublicMediaUrl(article.hero))
  const [uploading, setUploading] = useState(false)
  const setI18n = (field: 'title_i18n' | 'excerpt_i18n' | 'body_i18n', text: string) => setValue((v) => ({ ...v, [field]: { ...v[field], [editLocale]: text }, ...(field === 'title_i18n' && !v.slug ? { slug: safeSlug(text) } : {}) }))
  const submit = async (publish: boolean) => { setSaving(true); setError(''); try { if (!value.slug) throw new Error('Slug is required'); await saveArticle(session, value, publish); await onSaved() } catch (e: any) { setError(e.message) } finally { setSaving(false) } }
  const upload = async (file?: File) => { if (!file) return; setUploading(true); setError(''); try { const asset = await uploadArticleImage(session.user, file, value.title_i18n); setValue((v) => ({ ...v, hero_media_id: asset.id })); setImageUrl(getPublicMediaUrl(asset)) } catch (e: any) { setError(e.message) } finally { setUploading(false) } }
  const remove = async () => { if (!value.id || !confirm(t('delete') + '?')) return; setSaving(true); try { await deleteArticle(value.id); await onSaved() } catch (e: any) { setError(e.message); setSaving(false) } }
  return <div className="editor-overlay"><div className="editor-sheet"><div className="editor-header"><div><button className="back-link" onClick={close}><ArrowLeft size={17} /> {t('close')}</button><h2>{value.id ? t('editArticle') : t('newArticle')}</h2></div><div className="editor-actions">{value.id && <button className="danger-text" onClick={remove}>{t('delete')}</button>}<button className="secondary-btn" disabled={saving} onClick={() => submit(false)}>{t('saveDraft')}</button><button className="primary-btn" disabled={saving} onClick={() => submit(true)}>{t('publish')}</button></div></div><div className="editor-grid"><aside className="editor-settings"><label>{t('category')}<select value={value.category_id || ''} onChange={(e) => setValue({ ...value, category_id: e.target.value || null })}><option value="">CNM</option>{categories.map((c) => <option key={c.id} value={c.id}>{localized(c.name_i18n, locale)}</option>)}</select></label><label>Slug<input value={value.slug} onChange={(e) => setValue({ ...value, slug: safeSlug(e.target.value) })} /></label><div className="image-control"><span>{t('heroImage')}</span>{imageUrl && <img src={imageUrl} alt="" />}<label className="upload-control">{uploading ? t('uploading') : t('uploadImage')}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => upload(e.target.files?.[0])} /></label></div></aside><section className="editor-content"><div className="translation-tabs">{localeOrder.map((l) => <button key={l} className={editLocale === l ? 'active' : ''} onClick={() => setEditLocale(l)}>{l.toUpperCase()}<span>{localeNames[l]}</span></button>)}</div><label>{t('title')}<input className="headline-input" value={value.title_i18n[editLocale] || ''} onChange={(e) => setI18n('title_i18n', e.target.value)} /></label><label>{t('excerpt')}<textarea className="excerpt-input" value={value.excerpt_i18n[editLocale] || ''} onChange={(e) => setI18n('excerpt_i18n', e.target.value)} /></label><label>{t('body')}<textarea className="body-input" value={value.body_i18n[editLocale] || ''} onChange={(e) => setI18n('body_i18n', e.target.value)} /></label>{error && <p className="form-error">{error}</p>}</section></div></div></div>
}

function StationEditor({ station, t, onSaved }: { station: StationConfig | null; t: (k: string) => string; onSaved: () => Promise<void> }) {
  const [value, setValue] = useState({ primary_stream_url: station?.primary_stream_url || '', low_data_stream_url: station?.low_data_stream_url || '', donation_url: station?.donation_url || '', stream_enabled: station?.stream_enabled || false })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setValue({ primary_stream_url: station?.primary_stream_url || '', low_data_stream_url: station?.low_data_stream_url || '', donation_url: station?.donation_url || '', stream_enabled: station?.stream_enabled || false })
  }, [station])
  const save = async () => { setSaving(true); try { await updateStation({ primary_stream_url: value.primary_stream_url || null, low_data_stream_url: value.low_data_stream_url || null, donation_url: value.donation_url || null, stream_enabled: value.stream_enabled }); await onSaved() } finally { setSaving(false) } }
  return <div className="station-editor"><Field label={t('primaryStream')} value={value.primary_stream_url} onChange={(v) => setValue({ ...value, primary_stream_url: v })} type="url" /><Field label={t('lowDataStream')} value={value.low_data_stream_url} onChange={(v) => setValue({ ...value, low_data_stream_url: v })} type="url" /><Field label={t('donationUrl')} value={value.donation_url} onChange={(v) => setValue({ ...value, donation_url: v })} type="url" /><label className="toggle-row"><input type="checkbox" checked={value.stream_enabled} onChange={(e) => setValue({ ...value, stream_enabled: e.target.checked })} /><span>{t('streamEnabled')}</span></label><button className="primary-btn" disabled={saving} onClick={save}>{t('updateStation')}</button></div>
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) { return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label> }
function TextArea({ label, value, onChange, required = false, tall = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; tall?: boolean }) { return <label className="field"><span>{label}</span><textarea className={tall ? 'tall' : ''} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label> }

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><h2>{title}</h2>{action && <button onClick={onAction}>{action} <span>→</span></button>}</div> }
function EmptyEditorial({ text }: { text: string }) { return <div className="editorial-empty"><div className="empty-rule" /><p>{text}</p></div> }
function LoadingLines() { return <div className="loading-lines"><span /><span /><span /></div> }
function SchedulePreview({ schedule, locale, empty }: { schedule: ScheduleSlot[]; locale: Locale; empty: string }) { if (!schedule.length) return <EmptyEditorial text={empty} />; return <div className="schedule-preview">{schedule.slice(0, 5).map((slot) => <div key={slot.id}><span>{dayNames[locale][slot.day_of_week]}</span><time>{fmtTime(slot.start_time)}</time><strong>{slot.show?.title}</strong></div>)}</div> }

function SiteFooter({ t, go }: { t: (k: string) => string; go: (p: string) => void }) { return <footer className="site-footer"><div className="footer-top"><img src="/cnm-mark-white.svg" alt="CNM" /><p>{t('radioNewsCulture')}</p></div><div className="footer-grid"><button onClick={() => go('/listen')}>{t('listen')}</button><button onClick={() => go('/news')}>{t('news')}</button><button onClick={() => go('/programs')}>{t('programs')}</button><button onClick={() => go('/community')}>{t('community')}</button><button onClick={() => go('/support')}>{t('support')}</button><button onClick={() => go('/about')}>{t('about')}</button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {t('footerLine')}</span><span>Positive Assistance, Inc.</span></div></footer> }
function MiniPlayer({ t, station, playing, toggleAudio }: { t: (k: string) => string; station: StationConfig | null; playing: boolean; toggleAudio: () => void }) { return <div className="mini-player"><button onClick={toggleAudio}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><span className="live-dot" /><strong>{station?.station_name || 'CNM'}</strong><span>{t('liveNow')}</span></div> }

export default App
