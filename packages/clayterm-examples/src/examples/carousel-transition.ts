import { close, fixed, grow, open, rgba, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";
import {
  buildSlideRows,
  buttonAtPointer,
  centerText,
  CONTROL_GAP,
  CONTROL_TO_FRAME_GAP,
  initialCarouselState,
  layoutMetrics,
  palette,
  pushButton,
  pushSlideRows,
  slides,
  type CarouselState,
  wrapSlide,
} from "../carousel/shared";

const size = getTerminalSize();

const example: ExampleDefinition<CarouselState> = {
  width: size.width,
  height: size.height,
  initialState: initialCarouselState(size),
  view(state) {
    const metrics = layoutMetrics(state.size);
    const hovered = buttonAtPointer(state.pointer, metrics);
    const indicator = `${state.currentSlide + 1}/${slides.length}`;
    const ops: Op[] = [];

    ops.push(
      open("root", {
        layout: { width: grow(), height: grow(), direction: "ttb" },
        bg: palette.appBg,
      }),
      open("", { layout: { width: grow(), height: fixed(metrics.frameTopY) } }),
      close(),
      open("center-row", {
        layout: { width: grow(), height: fixed(metrics.stackHeight), direction: "ltr" },
        bg: palette.appBg,
      }),
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
      open("stack", {
        layout: {
          width: fixed(metrics.stackWidth),
          height: fixed(metrics.stackHeight),
          direction: "ttb",
        },
        bg: palette.appBg,
      }),
      open("frame-row", {
        layout: { width: grow(), height: fixed(metrics.frameOuterHeight), direction: "ltr" },
        bg: palette.appBg,
      }),
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
    );

    const frameBg = state.currentSlide % 2 === 0 ? palette.frameBg : rgba(24, 36, 52);

    ops.push(
      open("slide-current", {
        layout: {
          width: fixed(metrics.frameOuterWidth),
          height: fixed(metrics.frameOuterHeight),
          direction: "ttb",
          padding: { left: 1, right: 1, top: 1, bottom: 1 },
        },
        bg: frameBg,
        border: { color: palette.frameBorder, left: 1, right: 1, top: 1, bottom: 1 },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
        transition: {
          duration: 0.28,
          easing: "easeOut",
          properties: ["bg"],
        },
      }),
    );
    pushSlideRows(
      ops,
      buildSlideRows(slides[state.currentSlide], metrics.frameInnerWidth, metrics.frameInnerHeight),
      frameBg,
    );
    ops.push(close());

    ops.push(
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
      close(),
      open("", { layout: { width: grow(), height: fixed(CONTROL_TO_FRAME_GAP) } }),
      close(),
      open("controls", {
        layout: { width: grow(), height: fixed(1), direction: "ltr" },
        bg: palette.appBg,
      }),
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
    );

    pushButton(
      ops,
      "Prev",
      metrics.controlWidth,
      hovered === "prev",
      state.pressedButton === "prev",
    );
    ops.push(
      open("", { layout: { width: fixed(CONTROL_GAP), height: fixed(1) }, bg: palette.appBg }),
      close(),
    );
    ops.push(
      open("indicator", { layout: { width: fixed(9), height: fixed(1) }, bg: palette.appBg }),
      text(centerText(indicator, 9), { color: palette.indicatorText }),
      close(),
    );
    ops.push(
      open("", { layout: { width: fixed(CONTROL_GAP), height: fixed(1) }, bg: palette.appBg }),
      close(),
    );
    pushButton(
      ops,
      "Next",
      metrics.controlWidth,
      hovered === "next",
      state.pressedButton === "next",
    );

    ops.push(
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
      close(),
      close(),
      open("", { layout: { width: grow(), height: grow() } }),
      close(),
      close(),
      close(),
    );

    return ops;
  },
  reduce(state, inputEvents) {
    let next = { ...state };

    for (const event of inputEvents) {
      if (event.type === "mousemove" || event.type === "mousedown" || event.type === "mouseup") {
        next.pointer = {
          x: event.x,
          y: event.y,
          down:
            event.type === "mousedown"
              ? true
              : event.type === "mouseup"
                ? false
                : next.pointer.down,
        };
      }
      if (event.type === "keydown") {
        if (event.key === "ArrowRight") {
          next.previousSlide = next.currentSlide;
          next.currentSlide = wrapSlide(next.currentSlide + 1);
          next.direction = 1;
          next.animating = true;
        }
        if (event.key === "ArrowLeft") {
          next.previousSlide = next.currentSlide;
          next.currentSlide = wrapSlide(next.currentSlide - 1);
          next.direction = -1;
          next.animating = true;
        }
      }
      if (event.type === "mousedown" && event.button === "left") {
        next.pressedButton = buttonAtPointer(next.pointer, layoutMetrics(next.size));
      }
      if (event.type === "mouseup") {
        const pressed = next.pressedButton;
        const hovered = buttonAtPointer(next.pointer, layoutMetrics(next.size));
        next.pressedButton = null;
        if (
          !next.animating &&
          (event.button === "left" || event.button === "release") &&
          pressed &&
          hovered === pressed
        ) {
          next.previousSlide = next.currentSlide;
          next.currentSlide = wrapSlide(next.currentSlide + (pressed === "prev" ? -1 : 1));
          next.direction = pressed === "prev" ? -1 : 1;
          next.animating = true;
        }
      }
    }
    return next;
  },
  animate(state) {
    if (!state.animating) return state;
    return { ...state };
  },
  afterRender(state, renderResult) {
    if (state.animating && !renderResult.animating) {
      return {
        ...state,
        previousSlide: null,
        animating: false,
      };
    }
    return state;
  },
  hasActiveTransitions(state, renderResult) {
    return state.animating && renderResult.animating;
  },
  summary(state) {
    return `native transition | ${slides[state.currentSlide].title}`;
  },
};

await runExample(example);
