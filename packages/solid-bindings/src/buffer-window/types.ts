import type { KeyboardEvent } from "@tui/core";
import type { JSX } from "../jsx-runtime";
import type {
  VirtualItem,
  VirtualViewportBudget,
  VirtualViewportHandle,
  VirtualViewportProps,
  VirtualViewportState,
} from "../virtual-scroll/types";

export type BufferId = string;
export type WindowId = string;
export type WindowMode = "split" | "docked" | "floating";

export interface BufferWindowViewState {
  collapsedKeys?: Readonly<Record<string, boolean>>;
  [key: string]: unknown;
}

export interface FloatingWindowConfig {
  x?: number;
  y?: number;
  expand?: { width?: number; height?: number };
  parent?: number;
  attachTo?: number;
  attachPoints?: { element?: number; parent?: number };
  pointerCaptureMode?: number;
  clipTo?: number;
  zIndex?: number;
}

export interface BufferWindowChrome {
  bg?: number;
  border?: { color: number; left?: number; right?: number; top?: number; bottom?: number };
  cornerRadius?: { tl?: number; tr?: number; bl?: number; br?: number };
  titleBg?: number;
  titleColor?: number;
  titlePadding?: { left?: number; right?: number; top?: number; bottom?: number };
  contentBg?: number;
  trackBg?: number;
  trackActiveColor?: number;
  trackInactiveColor?: number;
  trackGap?: number;
}

export interface BufferResolvedItemsContent {
  kind: "items";
  items: readonly VirtualItem[];
  initialAutoFollow?: boolean;
}

export interface TextStreamBufferSnapshot {
  version: string | number;
  baseIndex: number;
  lines: readonly string[];
  maxLines: number;
}

export interface BufferResolvedTextStreamContent {
  kind: "text-stream";
  stream: TextStreamBufferSnapshot;
  initialAutoFollow?: boolean;
}

export type BufferResolvedContent = BufferResolvedItemsContent | BufferResolvedTextStreamContent;

export interface BufferModel {
  id: BufferId;
  kind: string;
  version: string | number;
  resolveContent(window: BufferWindowModel): BufferResolvedContent;
  subscribe?: (listener: () => void) => () => void;
}

export interface BufferWindowModel {
  id: WindowId;
  bufferId: BufferId;
  mode: WindowMode;
  title?: string;
  viewState?: BufferWindowViewState;
  focusable?: boolean;
  initialAutoFollow?: boolean;
  showTrack?: boolean;
  trackSide?: "left" | "right";
  requestedTrackSize?: number;
  floating?: FloatingWindowConfig;
  chrome?: BufferWindowChrome;
}

export interface BufferWindowState extends VirtualViewportState {
  windowId: WindowId;
  bufferId: BufferId;
  mode: WindowMode;
  bufferKind: string;
  viewState?: BufferWindowViewState;
}

export interface BufferWindowHandle extends VirtualViewportHandle {
  getState(): BufferWindowState;
}

export interface BufferWindowProps extends Omit<
  VirtualViewportProps,
  "id" | "items" | "initialAutoFollow" | "bg" | "border" | "cornerRadius" | "ref" | "onStateChange"
> {
  buffer: BufferModel;
  window: BufferWindowModel;
  budget?: VirtualViewportBudget;
  emptyState?: JSX.Element;
  ref?: (handle: BufferWindowHandle | undefined) => void;
  onStateChange?: (state: BufferWindowState) => void;
}

export interface ResolvedBufferWindowSurface {
  order: number;
  window: BufferWindowModel;
  buffer?: BufferModel;
  floating: boolean;
  zIndex: number;
}

export interface BufferWorkspaceProps {
  buffers: readonly BufferModel[];
  windows: readonly BufferWindowModel[];
  activeWindowId?: WindowId;
  initialActiveWindowId?: WindowId;
  onActiveWindowChange?: (windowId: WindowId | undefined) => void;
  manageKeyboardFocus?: boolean;
  focusable?: boolean;
  enableArrowKeys?: boolean;
  keyStepRows?: number;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  width?: {
    type: "fixed" | "grow" | "percent" | "fit";
    value?: number;
    min?: number;
    max?: number;
  };
  height?: {
    type: "fixed" | "grow" | "percent" | "fit";
    value?: number;
    min?: number;
    max?: number;
  };
  direction?: "ltr" | "ttb";
  padding?: { left?: number; right?: number; top?: number; bottom?: number };
  gap?: number;
  alignX?: number;
  alignY?: number;
  bg?: number;
  border?: { color: number; left?: number; right?: number; top?: number; bottom?: number };
  cornerRadius?: { tl?: number; tr?: number; bl?: number; br?: number };
  windowProps?: Readonly<Record<string, Omit<BufferWindowProps, "buffer" | "window">>>;
  emptyState?: JSX.Element | ((surface: ResolvedBufferWindowSurface) => JSX.Element);
}
