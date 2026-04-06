import { createInput, createTerm, type InputEvent, type Op, type PointerEvent } from "clayterm";

export interface PointerState {
  x: number;
  y: number;
  down: boolean;
}

export interface ExampleDefinition<State> {
  width: number;
  height: number;
  initialState: State;
  view(state: State, pointer: PointerState): Op[];
  reduce(state: State, inputEvents: InputEvent[], pointerEvents: PointerEvent[]): State;
  summary?(state: State): string | null;
  animate?(state: State): State;
  afterRender?(state: State, renderResult: { hasActiveTransitions?: boolean }): State;
  hasActiveTransitions?(state: State, renderResult: { hasActiveTransitions?: boolean }): boolean;
}

export function getTerminalSize() {
  const width = process.stdout.columns ?? Number(process.env.COLUMNS ?? 80);
  const height = process.stdout.rows ?? Number(process.env.LINES ?? 24);
  return { width, height };
}

export async function runExample<State>(definition: ExampleDefinition<State>) {
  const term = await createTerm({ width: definition.width, height: definition.height });
  const input = await createInput();

  let pointer: PointerState = { x: -1, y: -1, down: false };
  let state = definition.initialState;
  let cleanedUp = false;
  let tickTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingInputTimer: ReturnType<typeof setTimeout> | undefined;

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;

    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25h\x1b[?1006l\x1b[?1003l");
    }

    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
      process.stdin.setRawMode(false);
    }

    if (tickTimer) {
      clearTimeout(tickTimer);
      tickTimer = undefined;
    }

    if (pendingInputTimer) {
      clearTimeout(pendingInputTimer);
      pendingInputTimer = undefined;
    }
  }

  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1003h\x1b[?1006h\x1b[?25l");
  }

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(true);
  }

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  function scheduleTick() {
    if (tickTimer || !definition.animate) return;
    tickTimer = setTimeout(() => {
      tickTimer = undefined;
      state = definition.animate!(state);
      frame();
    }, 16);
  }

  function frame(deltaTime?: number) {
    const renderResult = term.render(definition.view(state, pointer), { pointer, deltaTime });
    const { output, events } = renderResult;
    state = definition.reduce(state, [], events);
    process.stdout.write(output);

    if (events.length > 0) {
      const rerender = term.render(definition.view(state, pointer), { pointer, deltaTime });
      process.stdout.write(rerender.output);
    }

    if (definition.afterRender) {
      state = definition.afterRender(state, renderResult);
    }

    const summary = definition.summary?.(state);
    process.stdout.write(`\x1b[1;1H\x1b[2K${summary ?? ""}`);

    if (definition.hasActiveTransitions?.(state, renderResult)) {
      scheduleTick();
    }
  }

  frame();

  process.stdin.on("data", (buf: Buffer) => {
    if (pendingInputTimer) {
      clearTimeout(pendingInputTimer);
      pendingInputTimer = undefined;
    }

    const result = input.scan(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
    const { events, pending } = result;

    for (const event of events) {
      if (event.type === "keydown" && event.ctrl && event.key.toLowerCase() === "c") {
        cleanup();
        process.exit(130);
      }
    }

    for (const event of events) {
      if (event.type === "mousemove") {
        pointer = { x: event.x, y: event.y, down: pointer.down };
      }
      if (event.type === "mousedown") {
        pointer = { x: event.x, y: event.y, down: true };
      }
      if (event.type === "mouseup") {
        pointer = { x: event.x, y: event.y, down: false };
      }
    }

    state = definition.reduce(state, events, []);
    frame(0);

    if (pending) {
      pendingInputTimer = setTimeout(() => {
        pendingInputTimer = undefined;
        const flush = input.scan();
        if (flush.events.length === 0) return;

        for (const event of flush.events) {
          if (event.type === "keydown" && event.ctrl && event.key.toLowerCase() === "c") {
            cleanup();
            process.exit(130);
          }
        }

        for (const event of flush.events) {
          if (event.type === "mousemove") {
            pointer = { x: event.x, y: event.y, down: pointer.down };
          }
          if (event.type === "mousedown") {
            pointer = { x: event.x, y: event.y, down: true };
          }
          if (event.type === "mouseup") {
            pointer = { x: event.x, y: event.y, down: false };
          }
        }

        state = definition.reduce(state, flush.events, []);
        frame(0);
      }, pending.delay);
    }
  });

  process.stdin.resume();
}
