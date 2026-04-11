import { describe, expect, mock, test } from "bun:test";
import type { ElementBounds } from "clayterm";
import { createElementBoundsObserver } from "../src/observe-element-bounds";

describe("element bounds observer", () => {
  test("coalesces repeated requests into one microtask read", async () => {
    const writes: Array<ElementBounds | undefined> = [];
    let reads = 0;

    const observer = createElementBoundsObserver({
      elementId: "viewport",
      readCurrent: () => undefined,
      readNext: () => {
        reads += 1;
        return { x: 0, y: 1, width: 10, height: 3 };
      },
      writeNext(bounds) {
        writes.push(bounds);
      },
    });

    observer.request();
    observer.request();
    observer.request();
    await new Promise((resolve) => queueMicrotask(resolve));

    expect(reads).toBe(1);
    expect(writes).toEqual([{ x: 0, y: 1, width: 10, height: 3 }]);
  });

  test("warns when the same next bounds repeat without converging", async () => {
    const warn = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warn;

    try {
      const next = { x: 0, y: 1, width: 10, height: 3 };
      const observer = createElementBoundsObserver({
        elementId: "viewport",
        warningThreshold: 3,
        readCurrent: () => undefined,
        readNext: () => next,
        writeNext() {
          // Intentionally never converge current to next.
        },
      });

      observer.request();
      await new Promise((resolve) => queueMicrotask(resolve));
      observer.request();
      await new Promise((resolve) => queueMicrotask(resolve));
      observer.request();
      await new Promise((resolve) => queueMicrotask(resolve));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("without converging");
    } finally {
      console.warn = originalWarn;
    }
  });
});
