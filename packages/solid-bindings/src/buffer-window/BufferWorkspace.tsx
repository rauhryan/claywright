import { grow } from "clayterm";
import { createMemo, createRenderEffect, createSignal } from "solid-js";
import type { KeyboardEvent } from "@tui/core";
import { markStatefulComponent } from "../component-flags";
import { BufferWindow } from "./BufferWindow";
import { createVirtualItemsBuffer } from "./buffers";
import {
  partitionBufferWindowSurfaces,
  resolveActiveWindowId,
  resolveBufferWindowSurfaces,
} from "./compositor";
import type {
  BufferModel,
  BufferWindowHandle,
  BufferWorkspaceProps,
  BufferWindowProps,
  ResolvedBufferWindowSurface,
  WindowId,
} from "./types";

const DEFAULT_KEY_STEP_ROWS = 1;

export function BufferWorkspace(rawProps: BufferWorkspaceProps) {
  const [uncontrolledActiveWindowId, setUncontrolledActiveWindowId] = createSignal<
    WindowId | undefined
  >(resolveActiveWindowId(rawProps.windows, undefined, rawProps.initialActiveWindowId));

  const windowHandles = new Map<WindowId, BufferWindowHandle>();
  const activeWindowId = createMemo(() => rawProps.activeWindowId ?? uncontrolledActiveWindowId());
  const surfaces = createMemo(() =>
    resolveBufferWindowSurfaces(rawProps.buffers, rawProps.windows),
  );
  const partitioned = createMemo(() => partitionBufferWindowSurfaces(surfaces()));
  const windowProps = createMemo(() => rawProps.windowProps ?? {});

  let previousActiveWindowId: WindowId | undefined;

  createRenderEffect(
    () => ({
      current: activeWindowId(),
      preferred: rawProps.initialActiveWindowId,
      controlled: rawProps.activeWindowId,
      windowsSignature: rawProps.windows
        .map((window) => `${window.id}:${window.focusable !== false ? 1 : 0}`)
        .join(";"),
    }),
    ({ current, preferred, controlled }) => {
      if (controlled !== undefined) {
        return;
      }

      const next = resolveActiveWindowId(rawProps.windows, current, preferred);
      if (next !== current) {
        setUncontrolledActiveWindowId(next);
      }
    },
  );

  createRenderEffect(
    () => ({
      current: activeWindowId(),
      controlled: rawProps.activeWindowId !== undefined,
    }),
    ({ current, controlled }) => {
      if (controlled) return;
      if (current === previousActiveWindowId) return;
      previousActiveWindowId = current;
      rawProps.onActiveWindowChange?.(current);
    },
  );

  function activateWindow(windowId: WindowId): void {
    if (rawProps.activeWindowId !== undefined) {
      if (rawProps.activeWindowId !== windowId) {
        rawProps.onActiveWindowChange?.(windowId);
      }
      return;
    }
    if (uncontrolledActiveWindowId() === windowId) return;
    setUncontrolledActiveWindowId(windowId);
  }

  function resolveWindowProps(
    surface: ResolvedBufferWindowSurface,
  ): Omit<BufferWindowProps, "buffer" | "window"> {
    return windowProps()[surface.window.id] ?? {};
  }

  function resolveBuffer(surface: ResolvedBufferWindowSurface): BufferModel {
    return (
      surface.buffer ??
      createVirtualItemsBuffer({
        id: `__missing__:${surface.window.id}`,
        kind: "missing-buffer",
        items: [],
      })
    );
  }

  function registerHandle(windowId: WindowId, handle: BufferWindowHandle | undefined): void {
    if (handle) {
      windowHandles.set(windowId, handle);
      return;
    }
    windowHandles.delete(windowId);
  }

  function getActiveHandle(): BufferWindowHandle | undefined {
    const current = activeWindowId();
    return current ? windowHandles.get(current) : undefined;
  }

  function cycleActiveWindow(direction: 1 | -1): void {
    const candidates = rawProps.windows.filter((window) => window.focusable !== false);
    const search = candidates.length > 0 ? candidates : rawProps.windows;
    if (search.length === 0) return;

    const current = resolveActiveWindowId(search, activeWindowId());
    const currentIndex = current ? search.findIndex((window) => window.id === current) : -1;
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + direction + search.length) % search.length : 0;
    activateWindow(search[nextIndex]!.id);
  }

  function handleWorkspaceKeyDown(event: KeyboardEvent): void {
    rawProps.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (!rawProps.manageKeyboardFocus) return;

    const code = event.code ?? event.key;
    if (code === "Tab") {
      cycleActiveWindow(event.shift ? -1 : 1);
      event.preventDefault();
      return;
    }
    if (code === "BracketRight" || event.key === "]") {
      cycleActiveWindow(1);
      event.preventDefault();
      return;
    }
    if (code === "BracketLeft" || event.key === "[") {
      cycleActiveWindow(-1);
      event.preventDefault();
      return;
    }

    const handle = getActiveHandle();
    if (!handle) return;

    const state = handle.getState();
    const pageStep = Math.max(state.viewportHeight - 1, 1);
    const keyStepRows = rawProps.keyStepRows ?? DEFAULT_KEY_STEP_ROWS;

    if (code === "PageUp") {
      handle.scrollBy(-pageStep);
      event.preventDefault();
      return;
    }
    if (code === "PageDown") {
      handle.scrollBy(pageStep);
      event.preventDefault();
      return;
    }
    if (code === "Home") {
      handle.scrollTo(0);
      event.preventDefault();
      return;
    }
    if (code === "End") {
      handle.scrollToLatest();
      event.preventDefault();
      return;
    }

    if (!rawProps.enableArrowKeys) return;
    if (code === "ArrowUp") {
      handle.scrollBy(-keyStepRows);
      event.preventDefault();
      return;
    }
    if (code === "ArrowDown") {
      handle.scrollBy(keyStepRows);
      event.preventDefault();
    }
  }

  function renderSurface(surface: ResolvedBufferWindowSurface) {
    const props = resolveWindowProps(surface);
    const emptyState =
      typeof rawProps.emptyState === "function"
        ? rawProps.emptyState(surface)
        : rawProps.emptyState;

    return (
      <BufferWindow
        buffer={resolveBuffer(surface)}
        window={surface.window}
        width={props.width}
        height={props.height}
        overscanRows={props.overscanRows}
        endThresholdRows={props.endThresholdRows}
        wheelStepRows={props.wheelStepRows}
        keyStepRows={props.keyStepRows}
        enableArrowKeys={props.enableArrowKeys}
        budget={props.budget}
        focusable={props.focusable}
        direction={props.direction}
        padding={props.padding}
        gap={props.gap}
        alignX={props.alignX}
        alignY={props.alignY}
        onClick={(event) => {
          activateWindow(surface.window.id);
          props.onClick?.(event);
        }}
        onMouseDown={(event) => {
          activateWindow(surface.window.id);
          props.onMouseDown?.(event);
        }}
        onMouseUp={props.onMouseUp}
        onMouseMove={props.onMouseMove}
        onWheel={(event) => {
          activateWindow(surface.window.id);
          props.onWheel?.(event);
        }}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (event.defaultPrevented) return;
          handleWorkspaceKeyDown(event);
        }}
        onKeyUp={props.onKeyUp}
        onPaste={props.onPaste}
        onFocus={() => {
          activateWindow(surface.window.id);
          props.onFocus?.();
        }}
        onBlur={props.onBlur}
        onStateChange={props.onStateChange}
        ref={(handle) => {
          registerHandle(surface.window.id, handle);
          props.ref?.(handle);
        }}
        emptyState={emptyState}
      />
    ) as never;
  }

  return (() => {
    const { docked, floating } = partitioned();

    return (
      <box
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
        focusable={rawProps.focusable ?? rawProps.manageKeyboardFocus ?? false}
        onKeyDown={handleWorkspaceKeyDown}
        onKeyUp={rawProps.onKeyUp}
        onFocus={rawProps.onFocus}
        onBlur={rawProps.onBlur}
      >
        {docked.map(renderSurface)}
        {floating.map(renderSurface)}
      </box>
    ) as never;
  }) as never;
}

markStatefulComponent(BufferWorkspace);
