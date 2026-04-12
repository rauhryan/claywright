import { describe, expect, test } from "bun:test";
import { computeViewportTrackGeometry } from "../src/virtual-scroll/track";

describe("virtual viewport track geometry", () => {
  test("fills the entire track when content fits", () => {
    expect(
      computeViewportTrackGeometry({ scrollTop: 0, contentHeight: 8, viewportHeight: 8 }),
    ).toEqual({
      maxScrollTop: 0,
      thumbPos: 0,
      thumbSize: 8,
      trackSize: 8,
    });
  });

  test("computes a smaller thumb when content exceeds the viewport", () => {
    const geometry = computeViewportTrackGeometry({
      scrollTop: 3,
      contentHeight: 80,
      viewportHeight: 8,
    });

    expect(geometry.trackSize).toBe(8);
    expect(geometry.maxScrollTop).toBe(72);
    expect(geometry.thumbSize).toBe(1);
    expect(geometry.thumbPos).toBeGreaterThanOrEqual(0);
    expect(geometry.thumbPos).toBeLessThanOrEqual(7);
  });

  test("clamps degenerate viewport heights to at least one track row", () => {
    expect(
      computeViewportTrackGeometry({ scrollTop: 0, contentHeight: 0, viewportHeight: 0 }),
    ).toEqual({
      maxScrollTop: 0,
      thumbPos: 0,
      thumbSize: 1,
      trackSize: 1,
    });
  });
});
