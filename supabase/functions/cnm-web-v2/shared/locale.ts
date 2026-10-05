export const localeOrder=['en','fr','ht','es'] as const
export type Locale=typeof localeOrder[number]
export const localeNames:Record<Locale,string>={en:'English',fr:'Fran\u00e7ais',ht:'Krey\u00f2l ayisyen',es:'Espa\u00f1ol'}
export function normalizeLocale(value:unknown):Locale{return typeof value==='string'&&localeOrder.includes(value as Locale)?value as Locale:'en'}
export type TranslatableArticle={title_i18n?:Record<string,string>;excerpt_i18n?:Record<string,string>;body_i18n?:Record<string,string>;content_blocks_i18n?:Record<string,unknown[]>}
export function selectArticleLocale(article:TranslatableArticle,requested:Locale){
 const availableLocales=localeOrder.filter(l=>Boolean(article.title_i18n?.[l]?.trim())&&Boolean(article.body_i18n?.[l]?.trim()||article.content_blocks_i18n?.[l]?.length))
 const shownLocale=availableLocales.includes(requested)?requested:availableLocales[0]||requested
 return {requestedLocale:requested,shownLocale,missingTranslation:shownLocale!==requested,availableLocales,title:article.title_i18n?.[shownLocale]||'',summary:article.excerpt_i18n?.[shownLocale]||'',body:article.body_i18n?.[shownLocale]||'',blocks:article.content_blocks_i18n?.[shownLocale]||[]}
}
export function readLocale():Locale{try{return normalizeLocale(localStorage.getItem('cnm-locale'))}catch{return 'en'}}
export function storeLocale(locale:Locale){try{localStorage.setItem('cnm-locale',locale)}catch{/* Storage can be disabled; selection still works in memory. */}}
