import { describe, expect, test } from "bun:test";
import { measureCellWidth } from "@tui/text-measure";
import { TextStreamVirtualizer } from "../src/index.ts";

describe("text-stream virtualizer", () => {
  test("monotonic indices survive eviction", () => {
    const v = new TextStreamVirtualizer({
      measureWidth: measureCellWidth,
      columns: 10,
      rows: 3,
      maxLines: 2,
    });
    expect(v.appendLine("one")).toBe(0);
    expect(v.appendLine("two")).toBe(1);
    expect(v.appendLine("three")).toBe(2);
    expect(v.baseIndex).toBe(1);
    expect(v.lineCount).toBe(2);
  });

  test("scrollBy moves through wrapped subrows", () => {
    const v = new TextStreamVirtualizer({ measureWidth: measureCellWidth, columns: 4, rows: 2 });
    v.appendLine("abcdefgh");
    expect(v.anchorSubRow).toBe(0);
    v.scrollBy(1);
    expect(v.anchorSubRow).toBe(1);
  });

  test("resolveViewport entries stay ordered and within row budget", () => {
    const v = new TextStreamVirtualizer({ measureWidth: measureCellWidth, columns: 4, rows: 3 });
    v.appendLine("abcd");
    v.appendLine("efghijkl");
    const vp = v.resolveViewport();
    const indices = vp.entries.map((entry) => entry.lineIndex);
    for (let index = 1; index < indices.length; index++) {
      expect(indices[index - 1]!).toBeLessThanOrEqual(indices[index]!);
    }
    const visibleRows = vp.entries.reduce((sum, entry) => sum + entry.visibleSubRows, 0);
    expect(visibleRows).toBeLessThanOrEqual(3);
  });
});
