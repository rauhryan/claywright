import type { MeasuredItem } from "./types";

export interface ScrollAnchor {
  key: string;
  intraOffset: number;
}

export function getFirstVisibleAnchor(
  measured: MeasuredItem[],
  scrollTop: number,
): ScrollAnchor | undefined {
  const item = measured.find((entry) => entry.offset + entry.height > scrollTop);
  if (!item) return undefined;
  return {
    key: item.key,
    intraOffset: Math.max(scrollTop - item.offset, 0),
  };
}

export function resolveAnchorScrollTop(
  measured: MeasuredItem[],
  anchor: ScrollAnchor | undefined,
): number | undefined {
  if (!anchor) return undefined;
  const item = measured.find((entry) => entry.key === anchor.key);
  if (!item) return undefined;
  return item.offset + anchor.intraOffset;
}
