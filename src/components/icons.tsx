const glyphs = {
  search: 'm21 21-4.4-4.4M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm3-3.9a4 4 0 0 1 0 7.8',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6m-4-9h.01',
  book: 'M12 6v15M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Z',
  tool: 'm14 7 3 3 4-4a6 6 0 0 1-8 8l-6 7a2 2 0 0 1-3-3l7-6a6 6 0 0 1 8-8Z',
  bag: 'M4 8h16l1 13H3L4 8Zm5 2V6a3 3 0 0 1 6 0v4',
  news: 'M6 3h15v16a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7h3m0-4v15m4-10h7m-7 4h7m-7 4h5',
  game: 'M7 7h10a4 4 0 0 1 4 3l1 5a3 3 0 0 1-5 3l-2-2H9l-2 2a3 3 0 0 1-5-3l1-5a4 4 0 0 1 4-3Zm1 3v4m-2-2h4m6 0h.01m3 1h.01',
  calendar: 'M3 5h18v16H3zM7 3v4m10-4v4M3 10h18m-14 5h2m3 0h2',
  layers: 'm12 2 10 5-10 5-10-5 10-5Zm10 10-10 5-10-5m20 5-10 5-10-5',
  external: 'M14 3h7v7m0-7-11 11m0-9H4v15h15v-6',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  chevron: 'm9 18 6-6-6-6',
  globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20m-10-10a18 18 0 0 0 0 20m0-20a18 18 0 0 1 0 20',
  sun: 'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  moon: 'M20.9 13.4A9 9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z',
} as const

export type Glyph = keyof typeof glyphs

export function Icon({ name, size = 18 }: { name: Glyph; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={glyphs[name]} /></svg>
}
