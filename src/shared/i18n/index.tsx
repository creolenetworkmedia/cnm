import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { localeLabels } from '../../i18n'
import { copy } from './copy'
import { normalizeLocale, localeOrder, localeNames, readLocale, storeLocale, type Locale } from '../locale'
export { normalizeLocale, localeOrder, localeNames, type Locale }
export { selectArticleLocale } from '../locale'
export const dictionaries = Object.fromEntries(localeOrder.map((locale, i) => [locale, {
  ...localeLabels[locale], ...Object.fromEntries(Object.entries(copy).map(([key, row]) => [key, row[i]]))
}])) as Record<Locale, Record<string, string>>
export const translate = (locale: Locale, key: string): string => dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key
const Context = createContext<{locale: Locale; setLocale: (locale: Locale) => void; t: (key: string) => string} | null>(null)
export function LocaleProvider({children}: {children: ReactNode}) {
  const [locale, set] = useState<Locale>(() => readLocale())
  const setLocale = (next: Locale) => { const valid = normalizeLocale(next); set(valid); storeLocale(valid) }
  useEffect(() => { document.documentElement.lang = locale }, [locale])
  return <Context.Provider value={{locale, setLocale, t: key => translate(locale, key)}}>{children}</Context.Provider>
}
export function useLocale() { const value = useContext(Context); if (!value) throw new Error('LocaleProvider required'); return value }
