// Cultiva's original 24 × 24 line artwork, shared by Vite and React Native.
type Circle = readonly [cx: number, cy: number, radius: number]
type Stroke = string | Circle

export const iconArtwork = {
  home: ["M3 11.5 12 4l9 7.5", "M5.5 10v10h13V10M9.5 20v-6h5v6"],
  spark: ["m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z", "m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"],
  calendar: ["M4 5h16v16H4zM8 3v4M16 3v4M4 10h16"],
  record: ["M6 3h12v18H6z", "M9 8h6M9 12h6M9 16h4"],
  user: [[12, 8, 4], "M4.5 21a7.5 7.5 0 0 1 15 0"],
  check: ["m5 12 4 4L19 6"],
  plus: ["M12 5v14M5 12h14"],
  arrow: ["m9 18 6-6-6-6"],
  leaf: ["M5 20c6 0 13-5 14-15C9 6 4 11 5 20Z", "M5 20c2-5 6-8 11-11"],
  activity: ["M3 12h4l2-6 4 12 2-6h6", [12, 12, 9]],
  heart: ["M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"],
  book: ["M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z"],
  water: ["M12 2S5 10.1 5 15a7 7 0 0 0 14 0c0-4.9-7-13-7-13Z"],
  utensils: ["M7 3v7M4 3v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3M7 10v11M17 3v18M17 3c-3 3-3 8 0 9"],
  clock: [[12, 12, 9], "M12 7v5l3 2"],
  message: ["M21 12a8 8 0 0 1-8 8H5l-3 2 1-5a9 9 0 1 1 18-5Z"],
  note: ["M5 3h14v18H5z", "M8 8h8M8 12h8M8 16h5"],
  scan: ["M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4", "M7 12h10"],
  settings: [[12, 12, 3], "M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"],
  send: ["m22 2-7 20-4-9-9-4 20-7Z", "M22 2 11 13"],
  search: [[11, 11, 7], "m20 20-4-4"],
  trash: ["M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"],
  logout: ["M10 5H5v14h5", "m14 8 4 4-4 4M8 12h10"],
  edit: ["m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z", "m13.5 6.5 3.5 3.5"],
  camera: ["M4 7h3l1.5-2h7L17 7h3v12H4z", [12, 13, 4]],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "m9 12 2 2 4-4"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"],
  filter: ["M4 5h16M7 12h10M10 19h4"],
  play: ["m8 5 11 7-11 7V5Z"],
  close: ["M6 6l12 12M18 6 6 18"],
} satisfies Record<string, readonly Stroke[]>

export type IconName = keyof typeof iconArtwork
