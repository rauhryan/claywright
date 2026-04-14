import { fixed, grow, measureCellWidth, skipAnsiSequence, TextStreamVirtualizer } from "clayterm";
import { createMemo, createRenderEffect, createSignal, onCleanup } from "solid-js";
import type { KeyboardEvent, MouseEvent, WheelEvent } from "@tui/core";
import type { TextViewportEntry } from "clayterm";
import type { VirtualViewportHandle, VirtualViewportState } from "../virtual-scroll/types";
import type { TextStreamBufferSnapshot } from "./types";

const DEFAULT_END_THRESHOLD_ROWS = 1;
const DEFAULT_WHEEL_STEP_ROWS = 3;
const DEFAULT_KEY_STEP_ROWS = 1;

interface RenderedTextStreamRow {
  key: string;
  text: string;
}

export interface TextStreamWindowRuntimeProps {
  id: string;
  stream: TextStreamBufferSnapshot;
  measuredWidth: number;
  measuredHeight: number;
  focusable?: boolean;
  bg?: number;
  initialAutoFollow?: boolean;
  wheelStepRows?: number;
  keyStepRows?: number;
  endThresholdRows?: number;
  enableArrowKeys?: boolean;
  onWheel?: (event: WheelEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onStateChange?: (state: VirtualViewportState) => void;
  ref?: (handle: VirtualViewportHandle | undefined) => void;
}

function stripAnsi(text: string): string {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const skip = skipAnsiSequence(text, index);
    if (skip > 0) {
      index += skip;
      continue;
    }

    const codePoint = text.codePointAt(index);
    if (codePoint === undefined) break;
    const charLength = codePoint > 0xffff ? 2 : 1;
    output += text.slice(index, index + charLength);
    index += charLength;
  }

  return output;
}

function materializeVisibleRows(entries: readonly TextViewportEntry[]): RenderedTextStreamRow[] {
  const rows: RenderedTextStreamRow[] = [];

  for (const entry of entries) {
    const wrapPoints = [0, ...entry.wrapPoints, entry.text.length];
    const lastVisibleSubRow = Math.min(
      entry.firstSubRow + entry.visibleSubRows,
      entry.totalSubRows,
    );

    for (let subRow = entry.firstSubRow; subRow < lastVisibleSubRow; subRow++) {
      const start = wrapPoints[subRow] ?? 0;
      const end = wrapPoints[subRow + 1] ?? entry.text.length;
      rows.push({
        key: `${entry.lineIndex}:${subRow}`,
        text: stripAnsi(entry.text.slice(start, end)),
      });
    }
  }

  return rows;
}

export function TextStreamWindowRuntime(props: TextStreamWindowRuntimeProps) {
  const [autoFollow, setAutoFollow] = createSignal(props.initialAutoFollow ?? true);
  const [rows, setRows] = createSignal<RenderedTextStreamRow[]>([]);
  const [state, setState] = createSignal<VirtualViewportState>({
    scrollTop: 0,
    contentHeight: 0,
    viewportHeight: Math.max(props.measuredHeight, 0),
    atStart: true,
    atEnd: true,
    autoFollow: props.initialAutoFollow ?? true,
    budgetExceeded: false,
    windowStartIndex: 0,
    windowEndIndex: 0,
  });

  const columns = createMemo(() => Math.max(1, Math.floor(props.measuredWidth)));
  const viewportRows = createMemo(() => Math.max(1, Math.floor(props.measuredHeight)));
  const endThresholdRows = createMemo(() => props.endThresholdRows ?? DEFAULT_END_THRESHOLD_ROWS);
  const wheelStepRows = createMemo(() => props.wheelStepRows ?? DEFAULT_WHEEL_STEP_ROWS);
  const keyStepRows = createMemo(() => props.keyStepRows ?? DEFAULT_KEY_STEP_ROWS);

  let virtualizer: TextStreamVirtualizer | undefined;
  let syncedBaseIndex = 0;
  let syncedLineCount = 0;
  let syncedVersion: string | number | undefined;
  let syncedColumns = 0;
  let syncedRows = 0;

  function rebuild(snapshot: TextStreamBufferSnapshot): void {
    const targetScrollTop = autoFollow() ? undefined : state().scrollTop;

    virtualizer = new TextStreamVirtualizer({
      measureWidth: measureCellWidth,
      maxLines: snapshot.maxLines,
      columns: columns(),
      rows: viewportRows(),
    });
    for (const line of snapshot.lines) {
      virtualizer.appendLine(line);
    }

    if (autoFollow()) {
      virtualizer.scrollToFraction(1);
    } else {
      virtualizer.scrollBy(-virtualizer.currentEstimatedVisualRow);
      if (targetScrollTop !== undefined && targetScrollTop > 0) {
        const maxTop = Math.max(virtualizer.totalEstimatedVisualRows - viewportRows(), 0);
        const clampedTop = Math.max(0, Math.min(targetScrollTop, maxTop));
        const targetAnchor =
          clampedTop < maxTop ? clampedTop : Math.max(virtualizer.totalEstimatedVisualRows - 1, 0);
        virtualizer.scrollBy(targetAnchor - virtualizer.currentEstimatedVisualRow);
      }
    }

    syncedBaseIndex = snapshot.baseIndex;
    syncedLineCount = snapshot.lines.length;
    syncedVersion = snapshot.version;
    syncedColumns = columns();
    syncedRows = viewportRows();
  }

  function syncVirtualizer(snapshot: TextStreamBufferSnapshot): void {
    if (!virtualizer) {
      rebuild(snapshot);
      return;
    }

    if (syncedColumns !== columns() || syncedRows !== viewportRows()) {
      virtualizer.resize(columns(), viewportRows());
      syncedColumns = columns();
      syncedRows = viewportRows();
      syncedVersion = snapshot.version;
      syncedBaseIndex = snapshot.baseIndex;
      syncedLineCount = snapshot.lines.length;
      return;
    }

    const previousTotal = syncedBaseIndex + syncedLineCount;
    const currentTotal = snapshot.baseIndex + snapshot.lines.length;

    if (snapshot.version === syncedVersion && previousTotal === currentTotal) {
      return;
    }

    if (
      currentTotal >= previousTotal &&
      snapshot.baseIndex >= syncedBaseIndex &&
      snapshot.lines.length > 0
    ) {
      const appendedCount = currentTotal - previousTotal;
      if (appendedCount > 0) {
        const appendedLines = snapshot.lines.slice(-appendedCount);
        for (const line of appendedLines) {
          virtualizer.appendLine(line);
        }
      }
      syncedBaseIndex = snapshot.baseIndex;
      syncedLineCount = snapshot.lines.length;
      syncedVersion = snapshot.version;
      return;
    }

    rebuild(snapshot);
  }

  function resolveTopVisibleVisualRow(
    viewport: ReturnType<TextStreamVirtualizer["resolveViewport"]>,
  ): number {
    if (!virtualizer) return 0;

    let rowsAboveAnchor = 0;
    for (const entry of viewport.entries) {
      if (entry.lineIndex < virtualizer.anchorLineIndex) {
        rowsAboveAnchor += entry.visibleSubRows;
        continue;
      }

      if (entry.lineIndex === virtualizer.anchorLineIndex) {
        rowsAboveAnchor += Math.max(virtualizer.anchorSubRow - entry.firstSubRow, 0);
      }
      break;
    }

    return Math.max(virtualizer.currentEstimatedVisualRow - rowsAboveAnchor, 0);
  }

  function scrollToTopVisualRow(offset: number): void {
    if (!virtualizer) return;

    const maxTop = Math.max(virtualizer.totalEstimatedVisualRows - viewportRows(), 0);
    const clampedTop = Math.max(0, Math.min(offset, maxTop));
    const targetAnchor =
      clampedTop < maxTop ? clampedTop : Math.max(virtualizer.totalEstimatedVisualRows - 1, 0);

    virtualizer.scrollBy(targetAnchor - virtualizer.currentEstimatedVisualRow);
    setAutoFollow(virtualizer.isAtBottom);
    syncDerivedState();
  }

  function syncDerivedState(): void {
    if (!virtualizer) {
      setRows([]);
      setState({
        scrollTop: 0,
        contentHeight: 0,
        viewportHeight: viewportRows(),
        atStart: true,
        atEnd: true,
        autoFollow: autoFollow(),
        budgetExceeded: false,
        windowStartIndex: 0,
        windowEndIndex: 0,
      });
      return;
    }

    const viewport = virtualizer.resolveViewport();
    const renderedRows = materializeVisibleRows(viewport.entries);
    const topVisibleRow = resolveTopVisibleVisualRow(viewport);
    const maxTop = Math.max(virtualizer.totalEstimatedVisualRows - viewportRows(), 0);
    const windowStartIndex = viewport.entries[0]?.lineIndex ?? 0;
    const windowEndIndex =
      viewport.entries.length > 0
        ? viewport.entries[viewport.entries.length - 1]!.lineIndex + 1
        : 0;

    setRows(renderedRows);
    setState({
      scrollTop: topVisibleRow,
      contentHeight: virtualizer.totalEstimatedVisualRows,
      viewportHeight: viewportRows(),
      atStart: topVisibleRow <= 0,
      atEnd: virtualizer.isAtBottom || topVisibleRow >= Math.max(maxTop - endThresholdRows(), 0),
      autoFollow: autoFollow(),
      budgetExceeded: false,
      windowStartIndex,
      windowEndIndex,
    });
  }

  function scrollBy(delta: number): void {
    if (!virtualizer) return;
    const viewport = virtualizer.resolveViewport();
    const currentTop = resolveTopVisibleVisualRow(viewport);
    scrollToTopVisualRow(currentTop + delta);
  }

  const handle: VirtualViewportHandle = {
    scrollTo(offset: number): void {
      scrollToTopVisualRow(offset);
    },
    scrollBy,
    scrollToLatest(): void {
      if (!virtualizer) return;
      virtualizer.scrollToFraction(1);
      setAutoFollow(true);
      syncDerivedState();
    },
    setAutoFollow(value: boolean): void {
      setAutoFollow(value);
      if (value && virtualizer) {
        virtualizer.scrollToFraction(1);
      }
      syncDerivedState();
    },
    getState(): VirtualViewportState {
      return state();
    },
  };

  createRenderEffect(
    () => ({
      stream: props.stream,
      columns: columns(),
      rows: viewportRows(),
      follow: autoFollow(),
    }),
    ({ stream }) => {
      syncVirtualizer(stream);
      syncDerivedState();
    },
  );

  createRenderEffect(
    () => state(),
    (current) => {
      props.onStateChange?.(current);
      props.ref?.(handle);
    },
  );

  onCleanup(() => {
    props.ref?.(undefined);
  });

  function handleWheel(event: WheelEvent): void {
    props.onWheel?.(event);
    if (event.defaultPrevented) return;
    scrollBy(event.direction === "up" ? -wheelStepRows() : wheelStepRows());
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    props.onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const pageStep = Math.max(viewportRows() - 1, 1);
    const code = event.code ?? event.key;

    if (code === "PageUp") {
      scrollBy(-pageStep);
      event.preventDefault();
      return;
    }
    if (code === "PageDown") {
      scrollBy(pageStep);
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

    if (!props.enableArrowKeys) return;
    if (code === "ArrowUp") {
      scrollBy(-keyStepRows());
      event.preventDefault();
      return;
    }
    if (code === "ArrowDown") {
      scrollBy(keyStepRows());
      event.preventDefault();
    }
  }

  return (() => (
    <box
      id={props.id}
      width={grow()}
      height={grow()}
      direction="ttb"
      focusable={props.focusable ?? true}
      bg={props.bg}
      onClick={props.onClick}
      onMouseDown={props.onMouseDown}
      onMouseUp={props.onMouseUp}
      onMouseMove={props.onMouseMove}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={props.onKeyUp}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
    >
      {rows().map((row) => (
        <box width={grow()} height={fixed(1)}>
          <text>{row.text}</text>
        </box>
      ))}
    </box>
  )) as never;
}
