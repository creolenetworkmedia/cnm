import type {Article,MediaAsset,ScheduleSlot} from '../../data'
import {localeOrder,type Locale} from '../../shared/locale'
import type {VideoRef} from '../../shared/media/video'
export type Photo = MediaAsset & {width?:number|null;height?:number|null;original_bytes?:number|null;tiny_path?:string|null;small_path?:string|null;medium_path?:string|null;large_path?:string|null;caption_i18n?:Record<string,string>;credit?:string}
export type PublicArticle = Article & {author_credit?:string;public_revision?:number;video?:VideoRef|null;gallery?:Photo[];is_sponsored?:boolean;sponsor_credit?:string;content_blocks_i18n?:Record<string,unknown[]>;hero?:Photo|null}
export type Program = ScheduleSlot
export function storyLabel(article:Article,requested:Locale){const shown=article.title_i18n[requested]?.trim()?requested:localeOrder.find(code=>article.title_i18n[code]?.trim())||requested;return {locale:shown,title:article.title_i18n[shown]||'',summary:article.excerpt_i18n[shown]||''}}
export function dateLabel(value:string|null|undefined,locale:Locale){if(!value||!Number.isFinite(Date.parse(value)))return '';return new Intl.DateTimeFormat(locale==='ht'?'fr-HT':locale,{year:'numeric',month:'short',day:'numeric'}).format(new Date(value))}
