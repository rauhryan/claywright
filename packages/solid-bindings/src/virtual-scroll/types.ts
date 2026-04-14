import type { TextMeasureApi } from "clayterm";
import type { KeyboardEvent, MouseEvent, PasteEvent, WheelEvent } from "@tui/core";
import type { JSX } from "../jsx-runtime";

export interface VirtualItemMeasurement {
  height: number;
  estimatedElements?: number;
  estimatedMeasuredWords?: number;
}

export interface VirtualItem {
  key: string;
  version: string | number;
  measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement;
  render(): JSX.Element;
}

export interface VirtualViewportBudget {
  maxEstimatedElements?: number;
  maxEstimatedMeasuredWords?: number;
}

export interface VirtualViewportState {
  scrollTop: number;
  contentHeight: number;
  viewportHeight: number;
  atStart: boolean;
  atEnd: boolean;
  autoFollow: boolean;
  budgetExceeded: boolean;
  windowStartIndex: number;
  windowEndIndex: number;
}

export interface VirtualViewportHandle {
  scrollTo(offset: number): void;
  scrollBy(delta: number): void;
  scrollToLatest(): void;
  setAutoFollow(value: boolean): void;
  getState(): VirtualViewportState;
}

export interface VirtualViewportProps {
  id?: string;
  items: readonly VirtualItem[];
  measuredWidth?: number;
  measuredHeight?: number;
  overscanRows?: number;
  endThresholdRows?: number;
  wheelStepRows?: number;
  keyStepRows?: number;
  enableArrowKeys?: boolean;
  budget?: VirtualViewportBudget;
  onStateChange?: (state: VirtualViewportState) => void;
  ref?: (handle: VirtualViewportHandle | undefined) => void;
  initialAutoFollow?: boolean;
  focusable?: boolean;
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
  onClick?: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onWheel?: (event: WheelEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onPaste?: (event: PasteEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface MeasuredItem {
  item: VirtualItem;
  key: string;
  version: string | number;
  height: number;
  offset: number;
  estimatedElements: number;
  estimatedMeasuredWords: number;
}

export interface WindowLayout {
  measured: MeasuredItem[];
  contentHeight: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  windowStartIndex: number;
  windowEndIndex: number;
  beforeHeight: number;
  afterHeight: number;
  budgetExceeded: boolean;
}
