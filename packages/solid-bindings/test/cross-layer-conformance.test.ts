import { describe, expect, test } from "bun:test";
import {
  layoutText,
  measureCellWidth,
  measureWrappedHeight,
  prepareText,
  wrapText,
  type TextMeasureApi,
} from "clayterm";

describe("cross-layer conformance", () => {
  test("measureWrappedHeight matches prepareText/layoutText row counts", () => {
    const samples = [
      { text: "hello world", columns: 5 },
      { text: "alpha beta gamma delta", columns: 10 },
      { text: "文字列テスト", columns: 4 },
      { text: "e\u0301 cafe", columns: 3 },
    ];

    for (const sample of samples) {
      const prepared = prepareText(sample.text);
      const layout = layoutText(prepared, { columns: sample.columns });
      expect(measureWrappedHeight(sample.text, sample.columns)).toBe(layout.rowCount);
    }
  });

  test("text-heavy VirtualItem measurements can delegate to clayterm text APIs without drift", () => {
    const text = "This is a wrapped transcript block that should stay aligned across layers.";
    const columns = 12;
    const prepared = prepareText(text);
    const api: TextMeasureApi = {
      measureCellWidth,
      wrapText,
      measureWrappedHeight,
    };

    const item = {
      key: "message-1",
      version: 1,
      measure(width: number, textApi: TextMeasureApi) {
        return {
          height: textApi.measureWrappedHeight(text, width),
          estimatedElements: 1,
          estimatedMeasuredWords: 1,
        };
      },
    };

    expect(item.measure(columns, api).height).toBe(layoutText(prepared, { columns }).rowCount);
  });
});
