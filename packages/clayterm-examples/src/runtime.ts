import { createInput, createTerm, type InputEvent, type PointerEvent } from "clayterm";

export interface PointerState {
  x: number;
  y: number;
  down: boolean;
}

export interface ExampleDefinition<State, Ops> {
  width: number;
  height: number;
  initialState: State;
  view(state: State, pointer: PointerState): Ops[];
  reduce(state: State, inputEvents: InputEvent[], pointerEvents: PointerEvent[]): State;
  summary?(state: State): string | null;
}

export function getTerminalSize() {
  const width = process.stdout.columns ?? Number(process.env.COLUMNS ?? 80);
  const height = process.stdout.rows ?? Number(process.env.LINES ?? 24);
  return { width, height };
}

export async function runExample<State, Ops>(definition: ExampleDefinition<State, Ops>) {
  const term = await createTerm({ width: definition.width, height: definition.height });
  const input = await createInput();

  let pointer: PointerState = { x: -1, y: -1, down: false };
  let state = definition.initialState;
  let cleanedUp = false;

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;

    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25h\x1b[?1006l\x1b[?1003l");
    }

    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
      process.stdin.setRawMode(false);
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

  function frame() {
    const { output, events } = term.render(definition.view(state, pointer), { pointer });
    state = definition.reduce(state, [], events);
    process.stdout.write(output);

    if (events.length > 0) {
      const rerender = term.render(definition.view(state, pointer), { pointer });
      process.stdout.write(rerender.output);
    }

    const summary = definition.summary?.(state);
    process.stdout.write(`\x1b[${definition.height};1H\x1b[2K${summary ?? ""}`);
  }

  frame();

  process.stdin.on("data", (buf) => {
    const { events } = input.scan(new Uint8Array(buf));

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
    frame();
  });

  process.stdin.resume();
}
