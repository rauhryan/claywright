import { describe, expect, test } from "bun:test";
import { measureCellWidth, measureWrappedHeight, wrapText } from "clayterm";
import { MeasurementCache } from "../src/virtual-scroll/measurement-cache";
import { computeWindowLayout, measureItems } from "../src/virtual-scroll/windowing";
import type { VirtualItem } from "../src/virtual-scroll/types";

function createItem(key: string, height: number, estimatedElements = 1): VirtualItem {
  return {
    key,
    version: 1,
    measure() {
      return { height, estimatedElements, estimatedMeasuredWords: height };
    },
    render() {
      return key as never;
    },
  };
}

describe("virtual scroll measurement helpers", () => {
  test("measureCellWidth handles empty text and combining marks", () => {
    expect(measureCellWidth("")).toBe(0);
    expect(measureCellWidth("abc")).toBe(3);
    expect(measureCellWidth("e\u0301")).toBe(1);
  });

  test("wrapText and measureWrappedHeight agree", () => {
    const wrapped = wrapText("hello world", 5);
    expect(wrapped.length).toBe(measureWrappedHeight("hello world", 5));
    expect(wrapText("hello", 0)).toEqual([]);
    expect(measureWrappedHeight("hello", 0)).toBe(0);
  });

  test("invalid widths throw RangeError", () => {
    expect(() => wrapText("hello", -1)).toThrow(RangeError);
    expect(() => measureWrappedHeight("hello", Number.NaN)).toThrow(RangeError);
  });
});

describe("virtual scroll windowing", () => {
  test("duplicate keys are rejected", () => {
    const cache = new MeasurementCache();
    const items = [createItem("dup", 1), createItem("dup", 2)];
    expect(() =>
      measureItems(items, 10, { measureCellWidth, wrapText, measureWrappedHeight }, cache),
    ).toThrow(/Duplicate virtual item key/);
  });

  test("budgetExceeded becomes true when visible items exceed budget", () => {
    const cache = new MeasurementCache();
    const measure = { measureCellWidth, wrapText, measureWrappedHeight };
    const measured = measureItems(
      [createItem("a", 2, 3), createItem("b", 2, 3), createItem("c", 2, 3)],
      10,
      measure,
      cache,
    );
    const layout = computeWindowLayout(measured, 0, 3, 3, { maxEstimatedElements: 1 });

    expect(layout.visibleStartIndex).toBe(0);
    expect(layout.visibleEndIndex).toBeGreaterThan(0);
    expect(layout.budgetExceeded).toBe(true);
    expect(layout.windowEndIndex).toBe(layout.visibleEndIndex);
  });

  test("overscan is reduced before visible coverage is reduced", () => {
    const cache = new MeasurementCache();
    const measure = { measureCellWidth, wrapText, measureWrappedHeight };
    const measured = measureItems(
      [createItem("a", 1, 1), createItem("b", 1, 1), createItem("c", 1, 1), createItem("d", 1, 1)],
      10,
      measure,
      cache,
    );

    const roomy = computeWindowLayout(measured, 1, 1, 2, { maxEstimatedElements: 10 });
    const tight = computeWindowLayout(measured, 1, 1, 2, { maxEstimatedElements: 1 });

    expect(roomy.windowStartIndex).toBeLessThanOrEqual(roomy.visibleStartIndex);
    expect(roomy.windowEndIndex).toBeGreaterThanOrEqual(roomy.visibleEndIndex);
    expect(tight.windowStartIndex).toBe(tight.visibleStartIndex);
    expect(tight.windowEndIndex).toBe(tight.visibleEndIndex);
  });
});
