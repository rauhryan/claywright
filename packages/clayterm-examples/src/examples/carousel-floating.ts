import { ATTACH_POINT, ATTACH_TO, close, fixed, grow, open, text, type Op } from "clayterm";
import { getTerminalSize, runExample, type ExampleDefinition } from "../runtime";
import {
  beginTransition,
  buildSlideRows,
  buttonAtPointer,
  centerText,
  CONTROL_GAP,
  CONTROL_TO_FRAME_GAP,
  finishTimedTransition,
  frameBaseY,
  frameTravel,
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
    const ops: Op[] = [];

    ops.push(open("root", { layout: { width: grow(), height: grow(), direction: "ttb" }, bg: palette.appBg }));

    const pushFloatingFrame = (key: string, slideIndex: number, offsetX: number) => {
      const rows = buildSlideRows(slides[slideIndex], metrics.frameInnerWidth, metrics.frameInnerHeight);
      ops.push(
        open(`frame-float-${key}`, {
          layout: { width: fixed(metrics.frameOuterWidth), height: fixed(metrics.frameOuterHeight) },
          floating: {
            x: offsetX,
            y: frameBaseY(metrics),
            attachTo: ATTACH_TO.ROOT,
            attachPoints: { element: ATTACH_POINT.CENTER_CENTER, parent: ATTACH_POINT.CENTER_CENTER },
            zIndex: 1,
          },
          bg: palette.appBg,
        }),
        open(`frame-${key}`, {
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
      );
      pushSlideRows(ops, rows, palette.frameBg);
      ops.push(close(), close());
    };

    if (state.transition) {
      const travel = frameTravel(metrics);
      const step = Math.round(transitionProgress(state.transition) * travel);
      const fromOffset = -step * state.transition.direction;
      const toOffset = (travel - step) * state.transition.direction;
      pushFloatingFrame("from", state.transition.fromIndex, fromOffset);
      pushFloatingFrame("to", state.transition.toIndex, toOffset);
    } else {
      pushFloatingFrame("current", state.currentSlide, 0);
    }

    ops.push(
      open("", { layout: { width: grow(), height: fixed(metrics.frameTopY) } }), close(),
      open("center-row", { layout: { width: grow(), height: fixed(metrics.stackHeight), direction: "ltr" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      open("stack", { layout: { width: fixed(metrics.stackWidth), height: fixed(metrics.stackHeight), direction: "ttb" }, bg: palette.appBg }),
      open("frame-row", { layout: { width: grow(), height: fixed(metrics.frameOuterHeight), direction: "ltr" }, bg: palette.appBg }),
      open("", { layout: { width: grow(), height: grow() } }), close(),
      open("frame-slot", { layout: { width: fixed(metrics.frameOuterWidth), height: fixed(metrics.frameOuterHeight) }, bg: palette.appBg }), close(),
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
  reduce(state, inputEvents) {
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
    return `floating frame | ${slides[state.transition?.toIndex ?? state.currentSlide].title}`;
  },
};

await runExample(example);
