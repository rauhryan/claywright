import { describe, expect, test } from "bun:test";
import {
  layoutText,
  materializeTextRow,
  nextTextRow,
  prepareText,
  walkTextRows,
} from "../src/index.ts";

describe("text layout core", () => {
  test("prepareText + layoutText work without a Term", () => {
    const prepared = prepareText("hello world");
    expect(layoutText(prepared, { columns: 80 })).toEqual({ rowCount: 1, maxRowWidth: 11 });
    expect(layoutText(prepared, { columns: 5 }).rowCount).toBeGreaterThan(1);
  });

  test("ANSI skip mode ignores recognized escape sequences", () => {
    const text = "\x1b[31mred\x1b[0m text";
    const prepared = prepareText(text, { ansi: "skip-csi-osc" });
    const layout = layoutText(prepared, { columns: 80 });
    expect(layout).toEqual({ rowCount: 1, maxRowWidth: 8 });
  });

  test("walkTextRows and nextTextRow agree", () => {
    const prepared = prepareText("abcdef", { whiteSpace: "pre-wrap" });
    const walked: string[] = [];
    walkTextRows(prepared, { columns: 2 }, (row) =>
      walked.push(materializeTextRow(prepared, row).text),
    );

    const iterated: string[] = [];
    let cursor = { segmentIndex: 0, clusterIndex: 0 };
    while (true) {
      const row = nextTextRow(prepared, cursor, { columns: 2 });
      if (!row) break;
      iterated.push(materializeTextRow(prepared, row).text);
      cursor = row.end;
    }

    expect(iterated).toEqual(walked);
  });

  test("materialized rows reconstruct visible text across wraps", () => {
    const prepared = prepareText("a🙂b🙂c", { whiteSpace: "pre-wrap" });
    const chunks: string[] = [];
    walkTextRows(prepared, { columns: 3 }, (row) =>
      chunks.push(materializeTextRow(prepared, row).text),
    );
    expect(chunks.join("")).toBe("a🙂b🙂c");
  });

  test("hard breaks produce empty rows without stalling iteration", () => {
    const prepared = prepareText("a\n\nb", { whiteSpace: "pre-wrap" });
    const iterated: string[] = [];
    let cursor = { segmentIndex: 0, clusterIndex: 0 };
    while (true) {
      const row = nextTextRow(prepared, cursor, { columns: 80 });
      if (!row) break;
      iterated.push(materializeTextRow(prepared, row).text);
      expect(
        row.end.segmentIndex > cursor.segmentIndex || row.end.clusterIndex > cursor.clusterIndex,
      ).toBe(true);
      cursor = row.end;
    }
    expect(iterated).toEqual(["a", "", "b"]);
  });

  test("trailing hard break does not invent an extra visible row", () => {
    const prepared = prepareText("a\n", { whiteSpace: "pre-wrap" });
    expect(layoutText(prepared, { columns: 80 })).toEqual({ rowCount: 1, maxRowWidth: 1 });
  });

  test("row cursors advance across segment boundaries created by hard breaks", () => {
    const prepared = prepareText("aa\nbb\ncc", { whiteSpace: "pre-wrap" });
    const rows: Array<{
      start: { segmentIndex: number; clusterIndex: number };
      end: { segmentIndex: number; clusterIndex: number };
    }> = [];
    walkTextRows(prepared, { columns: 80 }, (row) => rows.push(row));
    expect(rows.map((row) => row.start.segmentIndex)).toEqual([0, 1, 2]);
    expect(rows.map((row) => row.end.segmentIndex)).toEqual([1, 2, 3]);
  });
});
