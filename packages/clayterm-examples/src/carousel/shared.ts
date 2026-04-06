import { fixed, grow, open, close, rgba, text, type Op } from "clayterm";

export const ANIMATION_MS = 280;
export const TICK_MS = 16;
export const CONTROL_GAP = 2;
export const CONTROL_TO_FRAME_GAP = 1;
export const CONTROL_WIDTH_MIN = 8;
export const CONTROL_WIDTH_MAX = 12;
export const INDICATOR_WIDTH = 9;

export const palette = {
  appBg: rgba(7, 10, 16),
  frameBg: rgba(12, 18, 26),
  frameBorder: rgba(227, 202, 154),
  frameText: rgba(233, 236, 238),
  buttonBg: rgba(18, 28, 41),
  buttonHover: rgba(39, 62, 89),
  buttonPressed: rgba(77, 55, 29),
  buttonText: rgba(242, 243, 239),
  indicatorText: rgba(152, 178, 198),
};

export interface Slide {
  id: string;
  title: string;
  body: string[];
  art: (canvas: string[][]) => void;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutMetrics {
  frameOuterWidth: number;
  frameOuterHeight: number;
  frameInnerWidth: number;
  frameInnerHeight: number;
  stackWidth: number;
  stackHeight: number;
  controlWidth: number;
  controlBaseX: number;
  frameTopY: number;
  prevRect: Rect;
  nextRect: Rect;
}

export interface PointerState {
  x: number;
  y: number;
  down: boolean;
}

export interface CarouselTransition {
  fromIndex: number;
  toIndex: number;
  direction: 1 | -1;
  startedAt: number;
}

export interface CarouselState {
  size: { width: number; height: number };
  pointer: PointerState;
  currentSlide: number;
  pressedButton: ButtonName | null;
  transition: CarouselTransition | null;
  previousSlide: number | null;
  targetSlide: number;
  direction: 1 | -1;
  animating: boolean;
}

export type ButtonName = "prev" | "next";

export const slides: Slide[] = [
  { id: "dunes", title: "DUNES / 01", body: ["slow light over a quiet ridge"], art: drawDunes },
  { id: "tide", title: "TIDE / 02", body: ["night water and a patient little hull"], art: drawOcean },
  { id: "city", title: "CITY / 03", body: ["late windows / low traffic / warm electric hum"], art: drawCity },
  { id: "atlas", title: "ATLAS / 04", body: ["a room made from lines and timing"], art: drawGridRoom },
];

export function initialCarouselState(size: { width: number; height: number }): CarouselState {
  return {
    size,
    pointer: { x: -1, y: -1, down: false },
    currentSlide: 0,
    pressedButton: null,
    transition: null,
    previousSlide: null,
    targetSlide: 0,
    direction: 1,
    animating: false,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function wrapSlide(index: number) {
  return (index + slides.length) % slides.length;
}

export function layoutMetrics(size: { width: number; height: number }): LayoutMetrics {
  const controlWidth = clamp(
    Math.floor((size.width - INDICATOR_WIDTH - CONTROL_GAP * 2) / 2),
    CONTROL_WIDTH_MIN,
    CONTROL_WIDTH_MAX,
  );
  const controlGroupWidth = controlWidth * 2 + INDICATOR_WIDTH + CONTROL_GAP * 2;
  const maxFrameWidth = Math.max(18, size.width - 6);
  const maxFrameHeight = Math.max(8, size.height - CONTROL_TO_FRAME_GAP - 1 - 4);

  let frameOuterWidth = Math.min(maxFrameWidth, Math.floor(maxFrameHeight * 4 / 3));
  let frameOuterHeight = Math.min(maxFrameHeight, Math.floor(frameOuterWidth * 3 / 4));
  frameOuterWidth = Math.max(18, frameOuterWidth);
  frameOuterHeight = Math.max(8, frameOuterHeight);

  if (frameOuterHeight > maxFrameHeight) {
    frameOuterHeight = maxFrameHeight;
    frameOuterWidth = Math.max(18, Math.min(maxFrameWidth, Math.floor(frameOuterHeight * 4 / 3)));
  }
  if (frameOuterWidth > maxFrameWidth) {
    frameOuterWidth = maxFrameWidth;
    frameOuterHeight = Math.max(8, Math.min(maxFrameHeight, Math.floor(frameOuterWidth * 3 / 4)));
  }

  const frameInnerWidth = Math.max(1, frameOuterWidth - 2);
  const frameInnerHeight = Math.max(1, frameOuterHeight - 2);
  const stackHeight = frameOuterHeight + CONTROL_TO_FRAME_GAP + 1;
  const stackWidth = Math.max(frameOuterWidth, controlGroupWidth);
  const controlBaseX = Math.floor((size.width - controlGroupWidth) / 2);
  const frameTopY = Math.max(0, Math.floor((size.height - stackHeight) / 2));
  const controlY = frameTopY + frameOuterHeight + CONTROL_TO_FRAME_GAP;

  return {
    frameOuterWidth,
    frameOuterHeight,
    frameInnerWidth,
    frameInnerHeight,
    stackWidth,
    stackHeight,
    controlWidth,
    controlBaseX,
    frameTopY,
    prevRect: { x: controlBaseX, y: controlY, width: controlWidth, height: 1 },
    nextRect: {
      x: controlBaseX + controlWidth + CONTROL_GAP + INDICATOR_WIDTH + CONTROL_GAP,
      y: controlY,
      width: controlWidth,
      height: 1,
    },
  };
}

export function inRect(pointer: PointerState, rect: Rect) {
  return pointer.x >= rect.x && pointer.x < rect.x + rect.width &&
    pointer.y >= rect.y && pointer.y < rect.y + rect.height;
}

export function buttonAtPointer(pointer: PointerState, metrics: LayoutMetrics): ButtonName | null {
  if (inRect(pointer, metrics.prevRect)) return "prev";
  if (inRect(pointer, metrics.nextRect)) return "next";
  return null;
}

export function buttonBg(state: CarouselState, hovered: ButtonName | null, name: ButtonName) {
  if (state.pressedButton === name && state.pointer.down) return palette.buttonPressed;
  if (hovered === name) return palette.buttonHover;
  return palette.buttonBg;
}

export function beginTransition(state: CarouselState, direction: 1 | -1) {
  if (state.transition) return state;
  return {
    ...state,
    transition: {
      fromIndex: state.currentSlide,
      toIndex: wrapSlide(state.currentSlide + direction),
      direction,
      startedAt: performance.now(),
    },
  };
}

export function transitionProgress(transition: CarouselTransition | null) {
  if (!transition) return 0;
  const t = clamp((performance.now() - transition.startedAt) / ANIMATION_MS, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function frameTravel(metrics: LayoutMetrics) {
  return metrics.frameOuterWidth + Math.max(4, Math.floor(metrics.frameOuterWidth * 0.14));
}

export function frameBaseY(metrics: LayoutMetrics) {
  return -Math.floor((metrics.stackHeight - metrics.frameOuterHeight) / 2);
}

export function finishTimedTransition(state: CarouselState) {
  if (!state.transition) return state;
  const elapsed = performance.now() - state.transition.startedAt;
  if (elapsed < ANIMATION_MS) return { ...state, animating: true };
  return {
    ...state,
    currentSlide: state.transition.toIndex,
    transition: null,
    animating: false,
  };
}

export function createCanvas(width: number, height: number, fillChar: string) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fillChar));
}

export function put(canvas: string[][], x: number, y: number, ch: string) {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[0].length) return;
  canvas[y][x] = ch;
}

export function write(canvas: string[][], x: number, y: number, value: string) {
  for (let i = 0; i < value.length; i++) put(canvas, x + i, y, value[i]);
}

export function fillRect(canvas: string[][], x: number, y: number, width: number, height: number, ch: string) {
  for (let yy = 0; yy < height; yy++) {
    for (let xx = 0; xx < width; xx++) put(canvas, x + xx, y + yy, ch);
  }
}

export function drawAsciiBox(canvas: string[][], x: number, y: number, width: number, height: number) {
  if (width < 2 || height < 2) return;
  for (let xx = 1; xx < width - 1; xx++) {
    put(canvas, x + xx, y, "-");
    put(canvas, x + xx, y + height - 1, "-");
  }
  for (let yy = 1; yy < height - 1; yy++) {
    put(canvas, x, y + yy, "|");
    put(canvas, x + width - 1, y + yy, "|");
  }
  put(canvas, x, y, "+");
  put(canvas, x + width - 1, y, "+");
  put(canvas, x, y + height - 1, "+");
  put(canvas, x + width - 1, y + height - 1, "+");
}

export function centerText(value: string, width: number) {
  if (value.length >= width) return value.slice(0, width);
  const left = Math.floor((width - value.length) / 2);
  return `${" ".repeat(left)}${value}`.padEnd(width, " ");
}

export function padLeft(value: string, width: number) {
  if (value.length >= width) return value;
  return `${" ".repeat(width - value.length)}${value}`;
}

export function buildSlideRows(slide: Slide, width: number, height: number) {
  const canvas = createCanvas(width, height, " ");
  slide.art(canvas);
  write(canvas, 2, 1, slide.title);
  const bodyY = Math.max(2, height - slide.body.length - 1);
  for (let i = 0; i < slide.body.length; i++) {
    write(canvas, 2, bodyY + i, slide.body[i]);
  }
  return canvas.map((row) => row.join(""));
}

export function pushButton(ops: Op[], label: string, width: number, hovered: boolean, pressed: boolean) {
  const bg = pressed ? palette.buttonPressed : hovered ? palette.buttonHover : palette.buttonBg;
  ops.push(open("", { layout: { width: fixed(width), height: fixed(1) }, bg }), text(centerText(label, width), { color: palette.buttonText }), close());
}

export function pushSlideRows(ops: Op[], rows: string[], bg: number) {
  for (const row of rows) {
    ops.push(open("", { layout: { width: grow(), height: fixed(1) }, bg }), text(row, { color: palette.frameText }), close());
  }
}

export function drawDunes(canvas: string[][]): void {
  const width = canvas[0].length;
  const height = canvas.length;
  const sunX = Math.floor(width * 0.7);
  const sunY = Math.max(2, Math.floor(height * 0.28));
  const radius = Math.max(2, Math.floor(Math.min(width, height) * 0.08));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = x - sunX;
    const dy = y - sunY;
    if (dx * dx + dy * dy <= radius * radius) put(canvas, x, y, "o");
  }
  const horizon = Math.floor(height * 0.58);
  for (let x = 0; x < width; x++) {
    const ridge = horizon + Math.floor(Math.sin(x / 5) * 1.4);
    for (let y = ridge; y < height; y++) put(canvas, x, y, y % 2 === 0 ? "." : ",");
  }
  for (let x = 0; x < width; x++) {
    const front = Math.floor(height * 0.75) + Math.floor(Math.sin((x + 9) / 7) * 2);
    for (let y = front; y < height; y++) put(canvas, x, y, y % 2 === 0 ? ":" : ";");
  }
}

export function drawOcean(canvas: string[][]): void {
  const width = canvas[0].length;
  const height = canvas.length;
  const moonX = Math.max(5, width - 10);
  const moonY = Math.max(2, Math.floor(height * 0.18));
  put(canvas, moonX, moonY, "(");
  put(canvas, moonX + 1, moonY, "_");
  put(canvas, moonX + 2, moonY, ")");
  for (let i = 0; i < Math.min(8, width / 6); i++) put(canvas, 4 + i * 6, 2 + (i % 2), ".");
  const waterStart = Math.floor(height * 0.58);
  for (let y = waterStart; y < height; y++) for (let x = 0; x < width; x++) put(canvas, x, y, (x + y) % 4 < 2 ? "~" : "-");
  const boatY = Math.max(3, waterStart - 2);
  const boatX = Math.max(2, Math.floor(width * 0.38));
  write(canvas, boatX, boatY, "  /\\");
  write(canvas, boatX - 1, boatY + 1, "_/__\\_");
}

export function drawCity(canvas: string[][]): void {
  const width = canvas[0].length;
  const height = canvas.length;
  const ground = Math.floor(height * 0.72);
  for (let i = 0; i < Math.min(width / 5, 14); i++) put(canvas, 1 + i * 5, 2 + (i % 3), ".");
  let x = 0;
  let seed = 3;
  while (x < width) {
    const buildingWidth = 4 + (seed % 5);
    const buildingHeight = 4 + ((seed * 3) % Math.max(5, ground - 3));
    const top = Math.max(2, ground - buildingHeight);
    fillRect(canvas, x, top, Math.min(buildingWidth, width - x), ground - top, "#");
    for (let yy = top + 1; yy < ground - 1; yy += 2) {
      for (let xx = x + 1; xx < x + buildingWidth - 1 && xx < width - 1; xx += 2) {
        put(canvas, xx, yy, (xx + yy + seed) % 4 === 0 ? "*" : ".");
      }
    }
    x += buildingWidth + 1;
    seed += 2;
  }
  for (let xx = 0; xx < width; xx++) put(canvas, xx, ground, "=");
}

export function drawGridRoom(canvas: string[][]): void {
  const width = canvas[0].length;
  const height = canvas.length;
  const vanishingX = Math.floor(width / 2);
  const horizon = Math.max(2, Math.floor(height * 0.35));
  for (let x = 0; x < width; x += 4) {
    const dx = x - vanishingX;
    for (let y = horizon; y < height; y++) {
      const xx = vanishingX + Math.floor(dx * (y - horizon) / Math.max(1, height - horizon));
      put(canvas, xx, y, y % 2 === 0 ? "/" : "\\");
    }
  }
  for (let y = horizon; y < height; y += 2) {
    for (let x = 0; x < width; x++) if ((x + y) % 3 === 0) put(canvas, x, y, "-");
  }
  const cardW = Math.max(12, Math.floor(width * 0.36));
  const cardH = Math.max(4, Math.floor(height * 0.24));
  const cardX = Math.floor((width - cardW) / 2);
  const cardY = Math.max(2, Math.floor(height * 0.16));
  drawAsciiBox(canvas, cardX, cardY, cardW, cardH);
  write(canvas, cardX + 2, cardY + 1, "terminal carousel");
  write(canvas, cardX + 2, cardY + 2, "slide motion / locked frame");
}
