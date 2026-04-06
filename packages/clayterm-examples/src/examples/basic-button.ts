import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";

interface State {
  hovered: boolean;
  clicked: boolean;
}

const { width, height } = getTerminalSize();

const example: ExampleDefinition<State> = {
  width,
  height,
  initialState: {
    hovered: false,
    clicked: false,
  },
  view(state) {
    const title = state.clicked ? "Clicked" : state.hovered ? "Hovered" : "Idle";
    const bg = state.hovered ? rgba(245, 245, 245) : rgba(20, 24, 32);
    const color = state.hovered ? rgba(20, 24, 32) : rgba(245, 245, 245);

    return [
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: rgba(10, 14, 22),
      }),
      open("button", {
        layout: {
          width: fixed(Math.max(18, Math.floor(width / 3))),
          height: fixed(5),
          padding: { left: 2, top: 2 },
        },
        border: {
          color: rgba(120, 190, 255),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        bg,
      }),
      text(title, { color }),
      close(),
      close(),
    ];
  },
  reduce(state, inputEvents, pointerEvents) {
    const next = { ...state };

    for (const event of pointerEvents) {
      if (event.type === "pointerenter" && event.id === "button") {
        next.hovered = true;
      }
      if (event.type === "pointerleave" && event.id === "button") {
        next.hovered = false;
      }
      if (event.type === "pointerclick" && event.id === "button") {
        next.clicked = true;
      }
    }

    return next;
  },
  summary(state) {
    return state.clicked
      ? "Clayterm | clicked | Ctrl+C to exit"
      : state.hovered
        ? "Clayterm | hover active | click to confirm"
        : "Clayterm | move mouse into the panel";
  },
};

await runExample(example);
