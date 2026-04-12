import type { VirtualViewportState } from "./types";

export interface VirtualViewportTrackGeometry {
  maxScrollTop: number;
  thumbPos: number;
  thumbSize: number;
  trackSize: number;
}

export function computeViewportTrackGeometry(
  state: Pick<VirtualViewportState, "scrollTop" | "contentHeight" | "viewportHeight">,
  requestedTrackSize?: number,
): VirtualViewportTrackGeometry {
  const trackSize = Math.max(Math.floor(requestedTrackSize ?? state.viewportHeight), 1);
  const contentHeight = Math.max(state.contentHeight, 0);
  const maxScrollTop = Math.max(contentHeight - trackSize, 0);
  const thumbSize = contentHeight > trackSize
    ? Math.max(1, Math.round(trackSize * trackSize / Math.max(contentHeight, 1)))
    : trackSize;
  const thumbPos = maxScrollTop > 0
    ? Math.round(state.scrollTop / maxScrollTop * Math.max(trackSize - thumbSize, 0))
    : 0;

  return {
    maxScrollTop,
    thumbPos,
    thumbSize,
    trackSize,
  };
}
