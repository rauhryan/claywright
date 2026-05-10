import { describe, expect, test } from "bun:test";
import {
  measureCellWidth,
  measureWrappedHeight,
  skipAnsiSequence,
  wrapText,
} from "../src/index.ts";

describe("text measure helpers", () => {
  test("measureCellWidth handles representative content", () => {
    expect(measureCellWidth("")).toBe(0);
    expect(measureCellWidth("abc")).toBe(3);
    expect(measureCellWidth("e\u0301")).toBe(1);
    expect(measureCellWidth("文字")).toBe(4);
  });

  test("wrapText and measureWrappedHeight agree", () => {
    const wrapped = wrapText("hello world", 5);
    expect(wrapped.length).toBe(measureWrappedHeight("hello world", 5));
    expect(wrapped[0]?.text.length).toBeGreaterThan(0);
  });

  test("skipAnsiSequence recognizes CSI and OSC sequences", () => {
    expect(skipAnsiSequence("\x1b[31mred", 0)).toBeGreaterThan(0);
    expect(skipAnsiSequence("\x1b]8;;https://example.com\x07link", 0)).toBeGreaterThan(0);
    expect(skipAnsiSequence("plain", 0)).toBe(0);
  });
});
