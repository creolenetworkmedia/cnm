import type { SiteBase } from './paths'
declare const __CNM_SITE_BASE__: SiteBase
declare const __CNM_SITE_ORIGIN__: string
export function getSiteConfig(): {base: SiteBase; origin:string} {
  return {base:typeof __CNM_SITE_BASE__ === 'undefined' ? '/' : __CNM_SITE_BASE__, origin:typeof __CNM_SITE_ORIGIN__ === 'undefined' ? 'https://creolenetworkmedia.com' : __CNM_SITE_ORIGIN__}
}
export function assetPath(name:string):string {return getSiteConfig().base+name.replace(/^\/+/, '')}
