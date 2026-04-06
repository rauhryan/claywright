import { close, fixed, grow, open, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";
import {
  beginTransition,
  buildSlideRows,
  buttonAtPointer,
  centerText,
  CONTROL_GAP,
  CONTROL_TO_FRAME_GAP,
  finishTimedTransition,
  initialCarouselState,
  layoutMetrics,
  palette,
  pushButton,
  pushSlideRows,
  slides,
  transitionProgress,
  type CarouselState,
} from "../carousel/shared";

const size = getTerminalSize();

const example: ExampleDefinition<CarouselState, Op> = {
  width: size.width,
  height: size.height,
  initialState: initialCarouselState(size),
  view(state) {
    const metrics = layoutMetrics(state.size);
    const hovered = buttonAtPointer(state.pointer, metrics);
    const displayIndex = state.transition?.toIndex ?? state.currentSlide;
    const indicator = `${displayIndex + 1}/${slides.length}`;
    const slideWidth = metrics.frameInnerWidth;
    const transition = state.transition;
    const progress = transition ? transitionProgress(transition) : 0;
    const step = Math.round(progress * slideWidth);
    let trackOffset = 0;
    let trackWidth = slideWidth;
    let indices = [state.currentSlide];

    if (transition) {
      trackWidth = slideWidth * 2;
      if (transition.direction === 1) {
        indices = [transition.fromIndex, transition.toIndex];
        trackOffset = -step;
      } else {
        indices = [transition.toIndex, transition.fromIndex];
        trackOffset = step - slideWidth;
      }
    }

    const ops: Op[] = [];
    ops.push(
      open("root", { layout: { width: grow(), height: grow(), direction: "ttb" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: fixed(metrics.frameTopY) } }), close(),
      open("center-row", { layout: { width: grow(), height: fixed(metrics.stackHeight), direction: "ltr" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      open("stack", { layout: { width: fixed(metrics.stackWidth), height: fixed(metrics.stackHeight), direction: "ttb" }, bg: palette.appBg }),
      open("frame-row", { layout: { width: grow(), height: fixed(metrics.frameOuterHeight), direction: "ltr" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      open("frame", {
        layout: {
          width: fixed(metrics.frameOuterWidth),
          height: fixed(metrics.frameOuterHeight),
          direction: "ttb",
          padding: { left: 1, right: 1, top: 1, bottom: 1 },
        },
        bg: palette.frameBg,
        border: { color: palette.frameBorder, left: 1, right: 1, top: 1, bottom: 1 },
        cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
      }),
      open("viewport", {
        layout: { width: fixed(metrics.frameInnerWidth), height: fixed(metrics.frameInnerHeight) },
        clip: { horizontal: true, vertical: true, childOffset: { x: trackOffset, y: 0 } },
        bg: palette.frameBg,
      }),
      open("track", {
        layout: { width: fixed(trackWidth), height: fixed(metrics.frameInnerHeight), direction: "ltr" },
        bg: palette.frameBg,
      }),
    );

    for (const index of indices) {
      const rows = buildSlideRows(slides[index], metrics.frameInnerWidth, metrics.frameInnerHeight);
      ops.push(open("", { layout: { width: fixed(metrics.frameInnerWidth), height: fixed(metrics.frameInnerHeight), direction: "ttb" }, bg: palette.frameBg }));
      pushSlideRows(ops, rows, palette.frameBg);
      ops.push(close());
    }

    ops.push(
      close(), close(), close(),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      close(),
      open("", { layout: { width: grow(), height: fixed(CONTROL_TO_FRAME_GAP) } }), close(),
      open("controls", { layout: { width: grow(), height: fixed(1), direction: "ltr" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: grow() } }), close(),
    );

    pushButton(ops, "Prev", metrics.controlWidth, hovered === "prev", state.pressedButton === "prev");
    ops.push(open("", { layout: { width: fixed(CONTROL_GAP), height: fixed(1) }, bg: palette.appBg }), close());
    ops.push(open("indicator", { layout: { width: fixed(9), height: fixed(1) }, bg: palette.appBg }), text(centerText(indicator, 9), { color: palette.indicatorText }), close());
    ops.push(open("", { layout: { width: fixed(CONTROL_GAP), height: fixed(1) }, bg: palette.appBg }), close());
    pushButton(ops, "Next", metrics.controlWidth, hovered === "next", state.pressedButton === "next");

    ops.push(
      open("", { layout: { width: grow(), height: grow() } }), close(),
      close(),
      close(),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      close(),
      close(),
    );

    return ops;
  },
  reduce(state, inputEvents, pointerEvents) {
    let next = { ...state };

    for (const event of inputEvents) {
      if (event.type === "mousemove" || event.type === "mousedown" || event.type === "mouseup") {
        next.pointer = { x: event.x, y: event.y, down: event.type === "mousedown" ? true : event.type === "mouseup" ? false : next.pointer.down };
      }
      if (event.type === "keydown") {
        if (event.key === "ArrowRight") next = beginTransition(next, 1);
        if (event.key === "ArrowLeft") next = beginTransition(next, -1);
      }
      if (event.type === "mousedown" && event.button === "left") {
        next.pressedButton = buttonAtPointer(next.pointer, layoutMetrics(next.size));
      }
      if (event.type === "mouseup") {
        const pressed = next.pressedButton;
        const hovered = buttonAtPointer(next.pointer, layoutMetrics(next.size));
        next.pressedButton = null;
        if ((event.button === "left" || event.button === "release") && pressed && hovered === pressed) {
          next = beginTransition(next, pressed === "prev" ? -1 : 1);
        }
      }
    }

    return next;
  },
  animate(state) {
    return finishTimedTransition(state);
  },
  hasActiveTransitions(state) {
    return state.transition !== null;
  },
  summary(state) {
    return `track sliding | ${slides[state.transition?.toIndex ?? state.currentSlide].title}`;
  },
};

await runExample(example);
