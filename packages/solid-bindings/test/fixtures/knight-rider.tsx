/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const BAR_WIDTH = 8;
const CELL_W = 3;
const CELL_H = 3;
const FRAME_MS = 120;
const TRAIL_STEPS = 6;
const MIN_ALPHA = 0.3;
const INACTIVE_ALPHA = 0.12;
const FORWARD = BAR_WIDTH;
const HOLD_END = 9;
const BACKWARD = BAR_WIDTH - 1;
const HOLD_START = 30;
const TOTAL_FRAMES = FORWARD + HOLD_END + BACKWARD + HOLD_START;

const BASE: [number, number, number] = [255, 120, 120];
const BG: [number, number, number] = [10, 14, 22];
const BG_INT = rgba(...BG);

const BTN_BG = rgba(28, 34, 48);
const BTN_HOVER = rgba(55, 65, 85);
const BTN_ACTIVE = rgba(40, 120, 70);
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
  return f < FORWARD + HOLD_END ? 1 : -1;
}

function getFadeFactor(frame: number): number {
  const f = frame % TOTAL_FRAMES;
  if (f < FORWARD) {
    const p = FORWARD > 1 ? f / (FORWARD - 1) : 1;
    return MIN_ALPHA + p * (1 - MIN_ALPHA);
  }
  if (f < FORWARD + HOLD_END) {
    const p = (f - FORWARD) / Math.max(1, HOLD_END - 1);
    return 1 - p * (1 - MIN_ALPHA);
  }
  if (f < FORWARD + HOLD_END + BACKWARD) {
    const len = BACKWARD > 1 ? BACKWARD - 1 : 1;
    const p = (f - FORWARD - HOLD_END) / len;
    return MIN_ALPHA + p * (1 - MIN_ALPHA);
  }
  const p = (f - FORWARD - HOLD_END - BACKWARD) / Math.max(1, HOLD_START - 1);
  return 1 - p * (1 - MIN_ALPHA);
}

function squareColor(index: number, frame: number, running: boolean): number {
  if (!running) return blend(BASE, BG, INACTIVE_ALPHA);

  const pos = getPosition(frame);
  const dir = getDirection(frame);
  const fade = getFadeFactor(frame);
  const behind = (pos - index) * dir;

  if (behind === 0) return blend(BASE, BG, fade);

  if (behind > 0 && behind <= TRAIL_STEPS) {
    const alpha = Math.pow(0.65, behind - 1) * fade;
    if (behind === 1) {
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

const [running, setRunning] = createSignal(false);
const [statusMsg, setStatusMsg] = createSignal("paused");
const [frame, setFrame] = createSignal(0);

let interval: ReturnType<typeof setInterval> | null = null;
let raf: () => void = () => {};

function startAnimation() {
  if (interval) return;
  setRunning(true);
  setStatusMsg("running");
  setFrame(0);
  interval = setInterval(() => {
    setFrame((f) => (f + 1) % TOTAL_FRAMES);
    raf();
  }, FRAME_MS);
}

function stopAnimation() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  setRunning(false);
  setStatusMsg("stopped");
}

runApp((ctx) => {
  raf = ctx.requestAnimationFrame;

  const barTotalW = BAR_WIDTH * CELL_W + (BAR_WIDTH - 1);
  const cells: number[] = [];
  for (let i = 0; i < BAR_WIDTH; i++) cells.push(i);

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={BG_INT}>
      <box width={grow()} height={grow()} />

      <box
        id="bar-area"
        width={grow()}
        height={fixed(CELL_H + 2)}
        direction="ttb"
        alignX={4}
        bg={BG_INT}
      >
        <box width={fixed(barTotalW)} height={fixed(CELL_H)} direction="ltr" gap={1}>
          {cells.map((i) => (
            <box
              id={`sq-${i}`}
              width={fixed(CELL_W)}
              height={fixed(CELL_H)}
              bg={squareColor(i, frame(), running())}
            >
              <text> </text>
            </box>
          ))}
        </box>
      </box>

      <box width={grow()} height={fixed(2)} />

      <box width={grow()} height={fixed(3)} direction="ltr" alignX={4} gap={3}>
        <box
          id="start-btn"
          width={fixed(10)}
          height={fixed(3)}
          padding={{ left: 2, top: 1 }}
          bg={running() ? BTN_ACTIVE : BTN_HOVER}
          border={{
            color: running() ? rgba(80, 180, 120) : rgba(90, 140, 255),
            left: 1,
            right: 1,
            top: 1,
            bottom: 1,
          }}
          cornerRadius={{ tl: 1, tr: 1, bl: 1, br: 1 }}
          focusable={true}
          onClick={() => startAnimation()}
        >
          <text color={BTN_TEXT}>Start</text>
        </box>

        <box
          id="stop-btn"
          width={fixed(10)}
          height={fixed(3)}
          padding={{ left: 2, top: 1 }}
          bg={running() ? BTN_HOVER : BTN_BG}
          border={{
            color: running() ? rgba(200, 80, 80) : rgba(90, 90, 110),
            left: 1,
            right: 1,
            top: 1,
            bottom: 1,
          }}
          cornerRadius={{ tl: 1, tr: 1, bl: 1, br: 1 }}
          focusable={true}
          onClick={() => stopAnimation()}
        >
          <text color={BTN_TEXT}>Stop</text>
        </box>

        <box width={grow()} height={grow()} />
      </box>

      <box width={grow()} height={fixed(1)} padding={{ left: 2 }}>
        <text color={rgba(120, 190, 255)}>
          {statusMsg()} f:{frame()}
        </text>
      </box>

      <box width={grow()} height={grow()} />
    </box>
  );
});
