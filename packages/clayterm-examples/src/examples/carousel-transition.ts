import {
  close,
  EXIT_TRANSITION_SIBLING_ORDERING,
  fixed,
  grow,
  open,
  text,
  TRANSITION_ENTER_TRIGGER,
  TRANSITION_EXIT_TRIGGER,
  TRANSITION_HANDLER,
  TRANSITION_INTERACTION_HANDLING,
  TRANSITION_PRESET,
  TRANSITION_PROPERTY,
  type Op,
} from "clayterm";
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

    const pushTransitionSlide = (
      key: string,
      slideIndex: number,
      direction: 1 | -1,
      entering: boolean,
    ) => {
      const enterPreset = entering
        ? direction === 1
          ? TRANSITION_PRESET.ENTER_FROM_RIGHT
          : TRANSITION_PRESET.ENTER_FROM_LEFT
        : TRANSITION_PRESET.NONE;
      const exitPreset = !entering
        ? direction === 1
          ? TRANSITION_PRESET.EXIT_TO_LEFT
          : TRANSITION_PRESET.EXIT_TO_RIGHT
        : TRANSITION_PRESET.NONE;

      ops.push(
        open(`slide-${key}`, {
          layout: {
            width: fixed(metrics.frameOuterWidth),
            height: fixed(metrics.frameOuterHeight),
            direction: "ttb",
            padding: { left: 1, right: 1, top: 1, bottom: 1 },
          },
          bg: palette.frameBg,
          border: { color: palette.frameBorder, left: 1, right: 1, top: 1, bottom: 1 },
          cornerRadius: { tl: 1, tr: 1, bl: 1, br: 1 },
          transition: {
            duration: 0.28,
            handler: TRANSITION_HANDLER.EASE_OUT,
            properties: TRANSITION_PROPERTY.X,
            interactionHandling: TRANSITION_INTERACTION_HANDLING.DISABLE_WHILE_POSITIONING,
            enter: {
              preset: enterPreset,
              trigger: TRANSITION_ENTER_TRIGGER.TRIGGER_ON_FIRST_PARENT_FRAME,
            },
            exit: {
              preset: exitPreset,
              trigger: TRANSITION_EXIT_TRIGGER.TRIGGER_WHEN_PARENT_EXITS,
              siblingOrdering: EXIT_TRANSITION_SIBLING_ORDERING.NATURAL_ORDER,
            },
          },
        }),
      );
      pushSlideRows(
        ops,
        buildSlideRows(slides[slideIndex], metrics.frameInnerWidth, metrics.frameInnerHeight),
        palette.frameBg,
      );
      ops.push(close());
    };

    if (state.previousSlide !== null && state.animating) {
      pushTransitionSlide("previous", state.previousSlide, state.direction, false);
    }
    pushTransitionSlide("current", state.currentSlide, state.direction, state.animating);

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
        if (event.key === "ArrowRight" && !next.animating) {
          next.previousSlide = next.currentSlide;
          next.currentSlide = wrapSlide(next.currentSlide + 1);
          next.direction = 1;
          next.animating = true;
        }
        if (event.key === "ArrowLeft" && !next.animating) {
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
    if (state.animating && !renderResult.hasActiveTransitions) {
      return {
        ...state,
        previousSlide: null,
        animating: false,
      };
    }
    return state;
  },
  hasActiveTransitions(state, renderResult) {
    return state.animating && !!renderResult.hasActiveTransitions;
  },
  summary(state) {
    return `native transition | ${slides[state.currentSlide].title}`;
  },
};

await runExample(example);
