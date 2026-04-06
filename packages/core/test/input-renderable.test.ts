import { describe, expect, test } from "bun:test";
import { InputRenderable, KeyboardEvent, PasteEvent } from "../src/index.js";

describe("InputRenderable", () => {
  test("inserts typed characters", () => {
    const input = new InputRenderable();

    input.processEvent(
      new KeyboardEvent("keydown", input, {
        key: "a",
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      }),
    );

    expect(input.value).toBe("a");
    expect(input.cursorOffset).toBe(1);
  });

  test("handles backspace and arrow keys", () => {
    const input = new InputRenderable({ value: "ab", cursorOffset: 2 });

    input.processEvent(
      new KeyboardEvent("keydown", input, {
        code: "ArrowLeft",
        key: "ArrowLeft",
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      }),
    );
    input.processEvent(
      new KeyboardEvent("keydown", input, {
        key: "x",
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      }),
    );
    input.processEvent(
      new KeyboardEvent("keydown", input, {
        code: "Backspace",
        key: "Backspace",
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      }),
    );

    expect(input.value).toBe("ab");
    expect(input.cursorOffset).toBe(1);
  });

  test("inserts pasted text", () => {
    const input = new InputRenderable();

    input.processEvent(new PasteEvent(input, "hello"));

    expect(input.value).toBe("hello");
    expect(input.cursorOffset).toBe(5);
  });

  test("shows cursor only while focused", () => {
    const input = new InputRenderable();

    expect(input.showCursor).toBe(false);

    input.focus();
    expect(input.showCursor).toBe(true);

    input.blur();
    expect(input.showCursor).toBe(false);
  });
});
