import {
  fixed,
  grow,
  measureCellWidth,
  measureWrappedHeight,
  wrapText,
  type ElementBounds,
} from "clayterm";
import { createMemo, createRenderEffect, createSignal, onCleanup, untrack } from "solid-js";
import type { KeyboardEvent, WheelEvent } from "@tui/core";
import { getNextId } from "../opnode";
import { useAppContext } from "../runtime";
import { markStatefulComponent } from "../component-flags";
import { getFirstVisibleAnchor, resolveAnchorScrollTop } from "./anchor";
import { MeasurementCache } from "./measurement-cache";
import type {
  MeasuredItem,
  VirtualViewportHandle,
  VirtualViewportProps,
  VirtualViewportState,
} from "./types";
import { assertFiniteNonNegative, computeWindowLayout, measureItems } from "./windowing";

const DEFAULT_OVERSCAN_ROWS = 3;
const DEFAULT_END_THRESHOLD_ROWS = 1;
const DEFAULT_WHEEL_STEP_ROWS = 3;
const DEFAULT_KEY_STEP_ROWS = 1;

const measureApi = {
  measureCellWidth,
  wrapText,
  measureWrappedHeight,
};

export function VirtualViewport(rawProps: VirtualViewportProps) {
  const context = useAppContext();
  const viewportId = rawProps.id ?? getNextId("virtual-viewport");
  const cache = new MeasurementCache();
  const [bounds, setBounds] = createSignal<ElementBounds | undefined>(undefined);
  const [scrollTop, setScrollTop] = createSignal(0);
  const [autoFollow, setAutoFollow] = createSignal(rawProps.initialAutoFollow ?? true);

  let previousMeasured: MeasuredItem[] = [];
  let previousScrollTop = 0;
  let previousMeasurementSignature = "";
  let previousAutoFollow = rawProps.initialAutoFollow ?? false;

  const overscanRows = createMemo(() => {
    const value = rawProps.overscanRows ?? DEFAULT_OVERSCAN_ROWS;
    assertFiniteNonNegative("overscanRows", value);
    return value;
  });
  const endThresholdRows = createMemo(() => {
    const value = rawProps.endThresholdRows ?? DEFAULT_END_THRESHOLD_ROWS;
    assertFiniteNonNegative("endThresholdRows", value);
    return value;
  });
  const wheelStepRows = createMemo(() => {
    const value = rawProps.wheelStepRows ?? DEFAULT_WHEEL_STEP_ROWS;
    assertFiniteNonNegative("wheelStepRows", value);
    return value;
  });
  const keyStepRows = createMemo(() => {
    const value = rawProps.keyStepRows ?? DEFAULT_KEY_STEP_ROWS;
    assertFiniteNonNegative("keyStepRows", value);
    return value;
  });
  const budget = createMemo(() => {
    const value = rawProps.budget;
    assertFiniteNonNegative("budget.maxEstimatedElements", value?.maxEstimatedElements);
    assertFiniteNonNegative("budget.maxEstimatedMeasuredWords", value?.maxEstimatedMeasuredWords);
    return value;
  });

  const viewportWidth = createMemo(() => Math.max(0, Math.floor(bounds()?.width ?? context.width)));
  const viewportHeight = createMemo(() =>
    Math.max(0, Math.floor(bounds()?.height ?? context.height)),
  );
  const measured = createMemo(() =>
    measureItems(rawProps.items, viewportWidth(), measureApi, cache),
  );
  const contentHeight = createMemo(() =>
    measured().reduce((total, item) => total + item.height, 0),
  );
  const maxScrollTop = createMemo(() => Math.max(contentHeight() - viewportHeight(), 0));
  const layout = createMemo(() =>
    computeWindowLayout(measured(), scrollTop(), viewportHeight(), overscanRows(), budget()),
  );
  const state = createMemo<VirtualViewportState>(() => ({
    scrollTop: scrollTop(),
    contentHeight: layout().contentHeight,
    viewportHeight: viewportHeight(),
    atStart: scrollTop() <= 0,
    atEnd: maxScrollTop() - scrollTop() <= endThresholdRows(),
    autoFollow: autoFollow(),
    budgetExceeded: layout().budgetExceeded,
    windowStartIndex: layout().windowStartIndex,
    windowEndIndex: layout().windowEndIndex,
  }));

  function clampScroll(next: number): number {
    return Math.max(0, Math.min(next, maxScrollTop()));
  }

  function isAtEnd(next: number): boolean {
    return maxScrollTop() - next <= endThresholdRows();
  }

  function commitScroll(next: number): void {
    const clamped = clampScroll(next);
    previousScrollTop = clamped;
    setScrollTop(clamped);
  }

  function userScrollBy(delta: number): void {
    commitScroll(scrollTop() + delta);
    setAutoFollow(isAtEnd(scrollTop()));
  }

  function scrollTo(offset: number): void {
    commitScroll(offset);
    if (isAtEnd(scrollTop())) {
      setAutoFollow(true);
    }
  }

  function scrollToLatest(): void {
    setAutoFollow(true);
    commitScroll(maxScrollTop());
  }

  const handle: VirtualViewportHandle = {
    scrollTo,
    scrollBy(delta: number) {
      commitScroll(scrollTop() + delta);
      if (isAtEnd(scrollTop())) {
        setAutoFollow(true);
      }
    },
    scrollToLatest,
    setAutoFollow(value: boolean) {
      setAutoFollow(value);
      if (value) {
        commitScroll(maxScrollTop());
      }
    },
    getState() {
      return state();
    },
  };

  createRenderEffect(
    () => ({ measured: measured(), viewportHeight: viewportHeight(), autoFollow: autoFollow() }),
    ({
      measured: currentMeasured,
      viewportHeight: currentViewportHeight,
      autoFollow: shouldFollow,
    }) => {
      const currentMax = Math.max(
        currentMeasured.reduce((total, item) => total + item.height, 0) - currentViewportHeight,
        0,
      );
      const currentSignature = `${currentViewportHeight}|${currentMeasured
        .map((item) => `${item.key}:${item.version}:${item.height}:${item.offset}`)
        .join(";")}`;

      let nextScrollTop = clampScroll(untrack(() => scrollTop()));
      const measurementsChanged = currentSignature !== previousMeasurementSignature;
      const followChanged = shouldFollow !== previousAutoFollow;

      if (shouldFollow) {
        if (measurementsChanged || followChanged) {
          nextScrollTop = currentMax;
        }
      } else if (measurementsChanged) {
        const anchor = getFirstVisibleAnchor(previousMeasured, previousScrollTop);
        const anchored = resolveAnchorScrollTop(currentMeasured, anchor);
        if (anchored !== undefined) {
          nextScrollTop = Math.max(0, Math.min(anchored, currentMax));
        }
      }

      previousMeasured = currentMeasured;
      previousScrollTop = nextScrollTop;
      previousMeasurementSignature = currentSignature;
      previousAutoFollow = shouldFollow;
      if (nextScrollTop !== untrack(() => scrollTop())) {
        setScrollTop(nextScrollTop);
      }
    },
  );

  createRenderEffect(
    () => ({
      layout: layout(),
      viewportWidth: viewportWidth(),
      viewportHeight: viewportHeight(),
      scrollTop: scrollTop(),
      autoFollow: autoFollow(),
    }),
    () => {
      queueMicrotask(() => {
        const nextBounds = context.getElementBounds(viewportId);
        if (!sameBounds(bounds(), nextBounds)) {
          setBounds(nextBounds);
        }
      });
    },
  );

  createRenderEffect(
    () => state(),
    (currentState) => {
      rawProps.onStateChange?.(currentState);
      rawProps.ref?.(handle);
    },
  );

  onCleanup(() => {
    rawProps.ref?.(undefined);
  });

  function handleWheel(event: WheelEvent): void {
    rawProps.onWheel?.(event);
    if (event.defaultPrevented) return;
    userScrollBy(event.direction === "up" ? -wheelStepRows() : wheelStepRows());
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    rawProps.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const pageStep = Math.max(viewportHeight() - 1, 1);
    const code = event.code ?? event.key;

    if (code === "PageUp") {
      userScrollBy(-pageStep);
      event.preventDefault();
      return;
    }
    if (code === "PageDown") {
      userScrollBy(pageStep);
      event.preventDefault();
      return;
    }
    if (code === "Home") {
      setAutoFollow(false);
      commitScroll(0);
      event.preventDefault();
      return;
    }
    if (code === "End") {
      scrollToLatest();
      event.preventDefault();
      return;
    }

    if (!rawProps.enableArrowKeys) return;
    if (code === "ArrowUp") {
      userScrollBy(-keyStepRows());
      event.preventDefault();
      return;
    }
    if (code === "ArrowDown") {
      userScrollBy(keyStepRows());
      event.preventDefault();
    }
  }

  return (
    <box
      id={viewportId}
      width={rawProps.width ?? grow()}
      height={rawProps.height ?? grow()}
      direction={rawProps.direction ?? "ttb"}
      padding={rawProps.padding}
      gap={rawProps.gap}
      alignX={rawProps.alignX}
      alignY={rawProps.alignY}
      bg={rawProps.bg}
      border={rawProps.border}
      cornerRadius={rawProps.cornerRadius}
      focusable={rawProps.focusable ?? true}
      onClick={rawProps.onClick}
      onMouseDown={rawProps.onMouseDown}
      onMouseUp={rawProps.onMouseUp}
      onMouseMove={rawProps.onMouseMove}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={rawProps.onKeyUp}
      onPaste={rawProps.onPaste}
      onFocus={rawProps.onFocus}
      onBlur={rawProps.onBlur}
      clip={{ vertical: true, childOffset: { y: -scrollTop() } }}
    >
      <box width={grow()} direction="ttb">
        <box width={grow()} height={fixed(layout().beforeHeight)} />
        {layout()
          .measured.slice(layout().windowStartIndex, layout().windowEndIndex)
          .map((entry) => entry.item.render())}
        <box width={grow()} height={fixed(layout().afterHeight)} />
      </box>
    </box>
  );
}

markStatefulComponent(VirtualViewport);

function sameBounds(a: ElementBounds | undefined, b: ElementBounds | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
