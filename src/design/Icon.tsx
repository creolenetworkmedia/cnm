import type {CSSProperties} from 'react'
export type IconName = 'play'|'pause'|'menu'|'close'|'arrow'|'back'|'down'|'user'|'globe'|'mail'|'plus'|'check'|'image'|'video'|'volume'|'file'|'heart'|'music'
const paths: Record<Exclude<IconName,'play'|'pause'>,string> = {
 menu:'M4 6h16M4 12h16M4 18h16', close:'m6 6 12 12M18 6 6 18', arrow:'M4 12h15m-6-6 6 6-6 6',back:'M20 12H5m6-6-6 6 6 6',down:'m6 9 6 6 6-6',
 user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
 mail:'M3 5h18v14H3zM3 5l9 8 9-8',plus:'M12 4v16M4 12h16',check:'m4 12 5 5L20 6',
 image:'M3 3h18v18H3zM3 17l6-7 5 5 3-3 4 5M16 7h.01',video:'M3 5h18v14H3zM10 9l5 3-5 3z',
 volume:'m11 4-6 5H2v6h3l6 5zM15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14',
 file:'M14 2H4v20h16V8l-6-6v6h6M8 12h8M8 16h8',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8',
 music:'M9 18V5l12-3v13M9 8l12-3M9 18a3 3 0 1 1-3-3c2 0 3 1 3 3M21 15a3 3 0 1 1-3-3c2 0 3 1 3 3'
}
export function Icon({name,size=22,style}:{name:IconName;size?:number;style?:CSSProperties}) {
 return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={style}>
 {name==='play'?<path d="m8 4 13 8-13 8z" fill="currentColor" stroke="none"/>:name==='pause'?<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" stroke="none"/>:<path d={paths[name]}/>}
 </svg>
}
