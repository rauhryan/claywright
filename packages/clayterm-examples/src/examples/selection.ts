import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";

interface State {
  value: string;
  selecting: boolean;
  anchor: number;
  focus: number;
}

const { width, height } = getTerminalSize();

const example: ExampleDefinition<State> = {
  width,
  height,
  initialState: {
    value: "Hello world",
    selecting: false,
    anchor: -1,
    focus: -1,
  },
  view(state) {
    const ops: Op[] = [];
    ops.push(
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: rgba(12, 14, 18),
      }),
    );
    ops.push(
      open("line", {
        layout: {
          width: fixed(Math.max(20, state.value.length + 4)),
          height: fixed(3),
          padding: { left: 2, top: 1 },
        },
        border: {
          color: rgba(255, 210, 120),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
      }),
    );

    for (let i = 0; i < state.value.length; i++) {
      const selected =
        state.anchor !== -1 &&
        state.focus !== -1 &&
        i >= Math.min(state.anchor, state.focus) &&
        i <= Math.max(state.anchor, state.focus);
      ops.push(
        open(`char-${i}`, {
          layout: { width: fixed(1), height: fixed(1) },
          bg: selected ? rgba(255, 255, 255) : undefined,
        }),
      );
      ops.push(text(state.value[i], { color: selected ? rgba(0, 0, 0) : rgba(255, 255, 255) }));
      ops.push(close());
    }

    ops.push(close());
    ops.push(close());
    return ops;
  },
  reduce(state, inputEvents, pointerEvents) {
    const next = { ...state };

    for (const event of inputEvents) {
      if (event.type === "mousedown") {
        next.selecting = true;
        next.anchor = event.x;
        next.focus = event.x;
      }
      if (event.type === "mouseup") {
        next.selecting = false;
        next.focus = event.x;
      }
    }

    for (const event of pointerEvents) {
      if (!event.id.startsWith("char-")) continue;
      const index = Number(event.id.slice(5));
      if (Number.isNaN(index)) continue;

      if (event.type === "pointerenter" && next.selecting) {
        next.focus = index;
      }
      if (event.type === "pointerclick") {
        next.anchor = index;
        next.focus = index;
        next.selecting = false;
      }
    }

    return next;
  },
  summary(state) {
    if (state.anchor === -1 || state.focus === -1) {
      return "Selection | Selected: none";
    }

    const start = Math.min(state.anchor, state.focus);
    const end = Math.max(state.anchor, state.focus);
    return `Selection | Selected: ${state.value.slice(start, end + 1)}`;
  },
};

await runExample(example);
