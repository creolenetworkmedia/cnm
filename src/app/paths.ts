export type SiteBase = '/' | '/cnm/'
export const pages = ['home','listen','news','programs','community','support','about','account','admin','watch','contact','sponsor','submit-story','terms','privacy','editorial-policy'] as const
export type Page = typeof pages[number]
export type Route = {page: Page} | {page:'article';slug:string} | {page:'not-found'}
export function toSitePath(path: string, base: SiteBase): string {
  const suffix = path.startsWith('/') ? path.slice(1) : path
  return base + suffix
}
export function parseSitePath(pathname: string, base: SiteBase): Route {
  let path = pathname
  if (base !== '/') {
    const root = base.slice(0,-1)
    if (path === root) path = '/'
    else if (path.startsWith(base)) path = path.slice(root.length)
    else return {page:'not-found'}
  }
  path = path.replace(/\/+$/, '') || '/'
  if (path === '/') return {page:'home'}
  if (path.startsWith('/news/')) {
    try {
      const slug = decodeURIComponent(path.slice(6))
      if (!slug || /[/\\\u0000-\u001f]/.test(slug)) return {page:'not-found'}
      return {page:'article',slug}
    } catch {return {page:'not-found'}}
  }
  const candidate=path.slice(1)
  return pages.includes(candidate as Page) && candidate !== 'home' ? {page:candidate as Page} : {page:'not-found'}
}
