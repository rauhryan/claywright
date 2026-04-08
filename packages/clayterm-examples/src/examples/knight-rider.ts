import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition, type PointerState } from "../runtime";

interface State {
  running: boolean;
  frameIndex: number;
  tickCount: number;
  startHovered: boolean;
  stopHovered: boolean;
  pressedButton: string | null;
  pointer: PointerState;
}

const size = getTerminalSize();

const BAR_WIDTH = 8;
const CELL_W = 3;
const CELL_H = 3;
const FRAME_TICKS = 3;

const FORWARD = BAR_WIDTH;
const HOLD_END = 9;
const BACKWARD = BAR_WIDTH - 1;
const HOLD_START = 30;
const TOTAL_FRAMES = FORWARD + HOLD_END + BACKWARD + HOLD_START;

const MIN_ALPHA = 0.3;
const TRAIL_STEPS = 6;
const INACTIVE_ALPHA = 0.12;

const BASE: [number, number, number] = [255, 120, 120];
const BG: [number, number, number] = [10, 14, 22];
const BG_INT = rgba(...BG);

const BTN_BG = rgba(28, 34, 48);
const BTN_HOVER_BG = rgba(55, 65, 85);
const BTN_ACTIVE_BG = rgba(40, 120, 70);
const BTN_STOP_HOVER = rgba(140, 40, 40);
const BTN_TEXT = rgba(220, 225, 235);

function blend(fg: [number, number, number], bg: [number, number, number], alpha: number): number {
  const r = Math.round(bg[0] * (1 - alpha) + fg[0] * alpha);
  const g = Math.round(bg[1] * (1 - alpha) + fg[1] * alpha);
  const b = Math.round(bg[2] * (1 - alpha) + fg[2] * alpha);
  return rgba(r, g, b);
}

function getPosition(frame: number): number {
  const f = frame % TOTAL_FRAMES;
  if (f < FORWARD) return f;
  if (f < FORWARD + HOLD_END) return BAR_WIDTH - 1;
  if (f < FORWARD + HOLD_END + BACKWARD) return BAR_WIDTH - 2 - (f - FORWARD - HOLD_END);
  return 0;
}

function getDirection(frame: number): number {
  const f = frame % TOTAL_FRAMES;
  if (f < FORWARD + HOLD_END) return 1;
  return -1;
}

function getFadeFactor(frame: number): number {
  const f = frame % TOTAL_FRAMES;
  if (f < FORWARD) {
    const progress = FORWARD > 1 ? f / (FORWARD - 1) : 1;
    return MIN_ALPHA + progress * (1 - MIN_ALPHA);
  }
  if (f < FORWARD + HOLD_END) {
    const progress = (f - FORWARD) / Math.max(1, HOLD_END - 1);
    return 1 - progress * (1 - MIN_ALPHA);
  }
  if (f < FORWARD + HOLD_END + BACKWARD) {
    const len = BACKWARD > 1 ? BACKWARD - 1 : 1;
    const progress = (f - FORWARD - HOLD_END) / len;
    return MIN_ALPHA + progress * (1 - MIN_ALPHA);
  }
  const progress = (f - FORWARD - HOLD_END - BACKWARD) / Math.max(1, HOLD_START - 1);
  return 1 - progress * (1 - MIN_ALPHA);
}

function getSquareColor(index: number, frame: number, running: boolean): number {
  if (!running) {
    return blend(BASE, BG, INACTIVE_ALPHA);
  }

  const pos = getPosition(frame);
  const dir = getDirection(frame);
  const fade = getFadeFactor(frame);
  const behindDist = (pos - index) * dir;

  if (behindDist === 0) {
    return blend(BASE, BG, fade);
  }

  if (behindDist > 0 && behindDist <= TRAIL_STEPS) {
    const alpha = Math.pow(0.65, behindDist - 1) * fade;
    if (behindDist === 1) {
      const bloom: [number, number, number] = [
        Math.min(255, Math.round(BASE[0] * 1.15)),
        Math.min(255, Math.round(BASE[1] * 1.15)),
        Math.min(255, Math.round(BASE[2] * 1.15)),
      ];
      return blend(bloom, BG, alpha);
    }
    return blend(BASE, BG, alpha);
  }

  return blend(BASE, BG, INACTIVE_ALPHA * fade);
}

const example: ExampleDefinition<State> = {
  width: size.width,
  height: size.height,

  initialState: {
    running: false,
    frameIndex: 0,
    tickCount: 0,
    startHovered: false,
    stopHovered: false,
    pressedButton: null,
    pointer: { x: -1, y: -1, down: false },
  },

  view(state) {
    const ops: Op[] = [];
    const barTotalW = BAR_WIDTH * CELL_W + (BAR_WIDTH - 1);

    ops.push(
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: BG_INT,
      }),
    );

    // vertical spacer (top third)
    ops.push(open("", { layout: { width: grow(), height: grow() } }));
    ops.push(close());

    // scanner bar area
    ops.push(
      open("bar-area", {
        layout: {
          width: grow(),
          height: fixed(CELL_H + 2),
          direction: "ttb",
          alignX: 4,
        },
        bg: BG_INT,
      }),
    );

    ops.push(
      open("bar-row", {
        layout: {
          width: fixed(barTotalW),
          height: fixed(CELL_H),
          direction: "ltr",
          gap: 1,
        },
      }),
    );

    for (let i = 0; i < BAR_WIDTH; i++) {
      const color = getSquareColor(i, state.frameIndex, state.running);
      ops.push(
        open(`sq-${i}`, {
          layout: { width: fixed(CELL_W), height: fixed(CELL_H) },
          bg: color,
        }),
      );
      ops.push(text(" ", {}));
      ops.push(close());
    }

    ops.push(close());
    ops.push(close());

    // spacer between bar and buttons
    ops.push(open("", { layout: { width: grow(), height: fixed(2) } }));
    ops.push(close());

    // button row
    const startBg =
      state.pressedButton === "start" ? BTN_ACTIVE_BG : state.startHovered ? BTN_HOVER_BG : BTN_BG;
    const stopBg =
      state.pressedButton === "stop" ? BTN_STOP_HOVER : state.stopHovered ? BTN_HOVER_BG : BTN_BG;

    ops.push(
      open("btn-row", {
        layout: {
          width: grow(),
          height: fixed(3),
          direction: "ltr",
          alignX: 4,
          gap: 3,
        },
      }),
    );

    ops.push(
      open("start-btn", {
        layout: { width: fixed(8), height: fixed(3) },
        bg: startBg,
        border: {
          color: state.running ? rgba(80, 180, 120) : rgba(90, 140, 255),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
      open("", {
        layout: { width: grow(), height: grow(), alignX: 4, alignY: 4 },
      }),
      text("▶ Start", { color: BTN_TEXT }),
      close(),
      close(),
    );

    ops.push(
      open("stop-btn", {
        layout: { width: fixed(8), height: fixed(3) },
        bg: stopBg,
        border: {
          color: state.running ? rgba(200, 80, 80) : rgba(90, 90, 110),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
      open("", {
        layout: { width: grow(), height: grow(), alignX: 4, alignY: 4 },
      }),
      text("■ Stop", { color: BTN_TEXT }),
      close(),
      close(),
    );

    ops.push(open("", { layout: { width: grow(), height: grow() } }), close());
    ops.push(close());

    // bottom spacer
    ops.push(open("", { layout: { width: grow(), height: grow() } }));
    ops.push(close());

    ops.push(close());

    return ops;
  },

  reduce(state, inputEvents, pointerEvents) {
    const next = { ...state };

    for (const event of pointerEvents) {
      if (event.type === "pointerenter") {
        if (event.id === "start-btn") next.startHovered = true;
        if (event.id === "stop-btn") next.stopHovered = true;
      }
      if (event.type === "pointerleave") {
        if (event.id === "start-btn") next.startHovered = false;
        if (event.id === "stop-btn") next.stopHovered = false;
      }
      if (event.type === "pointerclick") {
        if (event.id === "start-btn") {
          next.running = true;
          next.frameIndex = 0;
          next.tickCount = 0;
        }
        if (event.id === "stop-btn") {
          next.running = false;
        }
      }
    }

    for (const event of inputEvents) {
      if (event.type === "mousemove") {
        next.pointer = { x: event.x, y: event.y, down: next.pointer.down };
      }
      if (event.type === "mousedown") {
        next.pointer = {
          x: event.x,
          y: event.y,
          down: true,
        };
        next.pressedButton = null;
      }
      if (event.type === "mouseup") {
        next.pointer = { x: event.x, y: event.y, down: false };
        next.pressedButton = null;
      }
    }

    return next;
  },

  animate(state) {
    if (!state.running) return state;

    const nextTick = state.tickCount + 1;
    if (nextTick >= FRAME_TICKS) {
      return {
        ...state,
        tickCount: 0,
        frameIndex: (state.frameIndex + 1) % TOTAL_FRAMES,
      };
    }
    return { ...state, tickCount: nextTick };
  },

  hasActiveTransitions(state) {
    return state.running;
  },

  summary(state) {
    return state.running
      ? "Knight Rider | running | Ctrl+C to exit"
      : "Knight Rider | paused | Press Start | Ctrl+C to exit";
  },
};

await runExample(example);
