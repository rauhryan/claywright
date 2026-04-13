import { ATTACH_TO, fixed, grow, POINTER_CAPTURE_MODE } from "clayterm";
import { createMemo, createRenderEffect, createSignal, onCleanup } from "solid-js";
import { markStatefulComponent } from "../component-flags";
import { VirtualViewport } from "../virtual-scroll/VirtualViewport";
import { VirtualViewportTrack } from "../virtual-scroll/VirtualViewportTrack";
import type { VirtualViewportHandle, VirtualViewportState } from "../virtual-scroll/types";
import type {
  BufferWindowHandle,
  BufferWindowProps,
  BufferWindowState,
  FloatingWindowConfig,
} from "./types";

const DEFAULT_VIEWPORT_STATE: VirtualViewportState = {
  scrollTop: 0,
  contentHeight: 0,
  viewportHeight: 0,
  atStart: true,
  atEnd: true,
  autoFollow: true,
  budgetExceeded: false,
  windowStartIndex: 0,
  windowEndIndex: 0,
};

export function BufferWindow(rawProps: BufferWindowProps) {
  const [viewportState, setViewportState] = createSignal<VirtualViewportState>({
    ...DEFAULT_VIEWPORT_STATE,
    autoFollow: rawProps.window.initialAutoFollow ?? true,
  });

  let viewportHandle: VirtualViewportHandle | undefined;

  const resolvedBuffer = createMemo(() => rawProps.window.bufferId === rawProps.buffer.id);
  const resolved = createMemo(() =>
    resolvedBuffer()
      ? rawProps.buffer.resolveContent(rawProps.window)
      : { items: [], initialAutoFollow: rawProps.window.initialAutoFollow },
  );
  const chrome = createMemo(() => rawProps.window.chrome ?? {});
  const floating = createMemo<FloatingWindowConfig | undefined>(() => {
    if (rawProps.window.mode !== "floating") return undefined;
    return {
      attachTo: ATTACH_TO.ROOT,
      pointerCaptureMode: POINTER_CAPTURE_MODE.CAPTURE,
      ...rawProps.window.floating,
    };
  });
  const showTrack = createMemo(() => rawProps.window.showTrack ?? false);
  const state = createMemo<BufferWindowState>(() => ({
    ...viewportState(),
    windowId: rawProps.window.id,
    bufferId: rawProps.window.bufferId,
    mode: rawProps.window.mode,
    bufferKind: rawProps.buffer.kind,
    viewState: rawProps.window.viewState,
  }));

  const handle: BufferWindowHandle = {
    scrollTo(offset: number): void {
      viewportHandle?.scrollTo(offset);
    },
    scrollBy(delta: number): void {
      viewportHandle?.scrollBy(delta);
    },
    scrollToLatest(): void {
      viewportHandle?.scrollToLatest();
    },
    setAutoFollow(value: boolean): void {
      viewportHandle?.setAutoFollow(value);
    },
    getState(): BufferWindowState {
      return state();
    },
  };

  createRenderEffect(
    () => ({
      resolved: resolvedBuffer(),
      current: state(),
    }),
    ({ resolved, current }) => {
      if (!resolved) {
        rawProps.ref?.(undefined);
        return;
      }
      rawProps.onStateChange?.(current);
      rawProps.ref?.(handle);
    },
  );

  onCleanup(() => {
    rawProps.ref?.(undefined);
  });

  return (() => {
    const currentChrome = chrome();
    const currentResolvedBuffer = resolvedBuffer();
    const currentResolved = resolved();
    const framePadding = {
      left: currentChrome.border?.left ?? 0,
      right: currentChrome.border?.right ?? 0,
      top: currentChrome.border?.top ?? 0,
      bottom: currentChrome.border?.bottom ?? 0,
    };
    const track = showTrack() ? (
      <VirtualViewportTrack
        id={`${rawProps.window.id}:track`}
        state={viewportState()}
        rows={rawProps.window.requestedTrackSize}
        bg={currentChrome.trackBg}
        activeColor={currentChrome.trackActiveColor}
        inactiveColor={currentChrome.trackInactiveColor}
      />
    ) : null;

    return (
      <box
        id={rawProps.window.id}
        width={rawProps.width ?? grow()}
        height={rawProps.height ?? grow()}
        direction="ttb"
        bg={currentChrome.bg}
        border={currentChrome.border}
        cornerRadius={currentChrome.cornerRadius}
        floating={floating()}
      >
        <box width={grow()} height={grow()} direction="ttb" padding={framePadding}>
          {rawProps.window.title ? (
            <box
              width={grow()}
              height={fixed(1)}
              bg={currentChrome.titleBg}
              padding={currentChrome.titlePadding ?? { left: 1, right: 1 }}
            >
              <text color={currentChrome.titleColor}>{rawProps.window.title}</text>
            </box>
          ) : null}

          {currentResolvedBuffer ? (
            <box
              width={grow()}
              height={grow()}
              direction={showTrack() ? "ltr" : "ttb"}
              gap={showTrack() ? (currentChrome.trackGap ?? 1) : 0}
            >
              {showTrack() && rawProps.window.trackSide === "left" ? track : null}

              <VirtualViewport
                id={`${rawProps.window.id}:viewport`}
                items={currentResolved.items}
                width={grow()}
                height={grow()}
                overscanRows={rawProps.overscanRows}
                endThresholdRows={rawProps.endThresholdRows}
                wheelStepRows={rawProps.wheelStepRows}
                keyStepRows={rawProps.keyStepRows}
                enableArrowKeys={rawProps.enableArrowKeys}
                budget={rawProps.budget}
                initialAutoFollow={
                  currentResolved.initialAutoFollow ?? rawProps.window.initialAutoFollow
                }
                focusable={rawProps.window.focusable ?? rawProps.focusable}
                direction={rawProps.direction}
                padding={rawProps.padding}
                gap={rawProps.gap}
                alignX={rawProps.alignX}
                alignY={rawProps.alignY}
                bg={currentChrome.contentBg}
                onClick={rawProps.onClick}
                onMouseDown={rawProps.onMouseDown}
                onMouseUp={rawProps.onMouseUp}
                onMouseMove={rawProps.onMouseMove}
                onWheel={rawProps.onWheel}
                onKeyDown={rawProps.onKeyDown}
                onKeyUp={rawProps.onKeyUp}
                onPaste={rawProps.onPaste}
                onFocus={rawProps.onFocus}
                onBlur={rawProps.onBlur}
                onStateChange={setViewportState}
                ref={(value) => {
                  viewportHandle = value;
                }}
              />

              {showTrack() && rawProps.window.trackSide !== "left" ? track : null}
            </box>
          ) : (
            (rawProps.emptyState ?? (
              <box width={grow()} height={grow()} padding={{ left: 1, right: 1, top: 1 }}>
                <text color={currentChrome.titleColor ?? 0xffff8080}>
                  Unresolved buffer: {rawProps.window.bufferId}
                </text>
              </box>
            ))
          )}
        </box>
      </box>
    ) as never;
  }) as never;
}

markStatefulComponent(BufferWindow);
