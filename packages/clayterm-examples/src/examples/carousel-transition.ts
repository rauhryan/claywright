import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";
import { buttonBg, slides, type CarouselState, wrapIndex } from "../carousel/shared";

const { width, height } = getTerminalSize();

const example: ExampleDefinition<CarouselState, Op> = {
  width,
  height,
  initialState: {
    index: 0,
    hovered: null,
    pressed: null,
    status: "native transition | use Prev/Next or arrow keys",
  },
  view(state) {
    const slide = slides[state.index];
    return [
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: rgba(7, 10, 16),
      }),
      open("frame", {
        layout: { width: fixed(32), height: fixed(12), direction: "ttb" },
        bg: slide.bg,
        border: { color: slide.accent, left: 1, right: 1, top: 1, bottom: 1 },
      }),
      text(` ${slide.title}`, { color: slide.accent }),
      text(" native transition", { color: rgba(233, 236, 238) }),
      text(` ${slide.body}`, { color: rgba(233, 236, 238) }),
      text(` ${state.index + 1}/4`, { color: rgba(152, 178, 198) }),
      close(),
      open("controls", { layout: { width: fixed(32), height: fixed(1), direction: "ltr" } }),
      open("prev", { layout: { width: fixed(12), height: fixed(1) }, bg: buttonBg(state, "prev") }),
      text("  ← Prev", { color: rgba(242, 243, 239) }),
      close(),
      open("gap", { layout: { width: fixed(8), height: fixed(1) }, bg: rgba(7, 10, 16) }),
      text(" "),
      close(),
      open("next", { layout: { width: fixed(12), height: fixed(1) }, bg: buttonBg(state, "next") }),
      text("  Next →", { color: rgba(242, 243, 239) }),
      close(),
      close(),
      close(),
    ];
  },
  reduce(state, inputEvents, pointerEvents) {
    const next = { ...state };

    for (const event of inputEvents) {
      if (event.type === "keydown") {
        if (event.key === "ArrowRight") next.index = wrapIndex(next.index + 1);
        if (event.key === "ArrowLeft") next.index = wrapIndex(next.index - 1);
      }
    }

    for (const event of pointerEvents) {
      if (event.id === "prev" && event.type === "pointerenter") next.hovered = "prev";
      if (event.id === "next" && event.type === "pointerenter") next.hovered = "next";
      if (event.type === "pointerleave") next.hovered = null;
      if (event.id === "prev" && event.type === "pointerclick") next.index = wrapIndex(next.index - 1);
      if (event.id === "next" && event.type === "pointerclick") next.index = wrapIndex(next.index + 1);
    }

    next.status = "native transition | use Prev/Next or arrow keys";
    return next;
  },
  summary(state) {
    return `${state.status} | ${slides[state.index].title}`;
  },
};

await runExample(example);
