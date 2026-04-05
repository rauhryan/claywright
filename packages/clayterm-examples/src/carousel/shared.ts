import { rgba } from "clayterm";

export interface Slide {
  id: string;
  title: string;
  body: string;
  accent: number;
  bg: number;
}

export interface CarouselState {
  index: number;
  hovered: "prev" | "next" | null;
  pressed: "prev" | "next" | null;
  status: string;
}

export const slides: Slide[] = [
  { id: "dunes", title: "DUNES / 01", body: "slow light over a quiet ridge", bg: rgba(23, 20, 16), accent: rgba(227, 202, 154) },
  { id: "tide", title: "TIDE / 02", body: "night water and a patient little hull", bg: rgba(12, 18, 28), accent: rgba(120, 180, 255) },
  { id: "city", title: "CITY / 03", body: "late windows / low traffic / warm electric hum", bg: rgba(26, 16, 20), accent: rgba(255, 150, 170) },
  { id: "atlas", title: "ATLAS / 04", body: "a room made from lines and timing", bg: rgba(16, 22, 18), accent: rgba(160, 220, 180) },
];

export function wrapIndex(value: number) {
  return (value + slides.length) % slides.length;
}

export function buttonBg(state: CarouselState, name: "prev" | "next") {
  if (state.pressed === name) return rgba(77, 55, 29);
  if (state.hovered === name) return rgba(39, 62, 89);
  return rgba(18, 28, 41);
}
