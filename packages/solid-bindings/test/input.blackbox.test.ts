import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/input.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

function screenLines(session: TerminalSession): string[] {
  return session.getScreen().lines;
}

async function focusInput(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseMove(col, row);
  await session.wait(100);
  session.click(col, row, MouseButton.Left);
  expect(
    await session.waitForTextConvergence("yes", { timeout: 2000, settleMs: 100 }),
  ).not.toBeNull();
}

describe("input element", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("types text after focus", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Type here", 2000)).toBe(true);
    expect(screenContainsRaw(session, "Caret: hidden")).toBe(true);

    // Input content starts after outer padding + border + inner padding.
    // Click inside the text run rather than on the container edge.
    const inputCol = 3;
    const inputRow = 2;

    await focusInput(session, inputCol, inputRow);
    const linesAfterFocus = screenLines(session);
    expect(linesAfterFocus.some((line) => line.includes("|Type here"))).toBe(true);
    expect(linesAfterFocus.some((line) => line.includes("Focused: yes"))).toBe(true);
    expect(linesAfterFocus.some((line) => line.includes("Caret: visible"))).toBe(true);

    session.sendKey("h");
    session.sendKey("i");

    expect(
      await session.waitForTextConvergence("hi", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    const linesAfterTyping = screenLines(session);
    expect(linesAfterTyping.some((line) => line.includes("│hi"))).toBe(true);
    expect(linesAfterTyping.some((line) => line.includes("Value: hi"))).toBe(true);
  });

  test("supports backspace", async () => {
    await session.spawn("bun", [fixture]);

    const inputCol = 3;
    const inputRow = 2;

    await focusInput(session, inputCol, inputRow);

    const linesAfterFocus = screenLines(session);
    expect(linesAfterFocus.some((line) => line.includes("|Type here"))).toBe(true);

    session.sendKey("h");
    session.sendKey("i");
    session.sendKey("backspace");

    expect(await session.waitForFrameText("│h|", { timeout: 2000 })).not.toBeNull();
    const linesAfterBackspace = screenLines(session);

    expect(linesAfterBackspace.some((line) => line.includes("│h|"))).toBe(true);
    expect(linesAfterBackspace.some((line) => line.includes("Value: h"))).toBe(true);
  });

  test("supports arrow navigation and insertion", async () => {
    await session.spawn("bun", [fixture]);

    const inputCol = 3;
    const inputRow = 2;

    await focusInput(session, inputCol, inputRow);

    const linesAfterFocus = screenLines(session);
    expect(linesAfterFocus.some((line) => line.includes("|Type here"))).toBe(true);

    session.sendKey("h");
    session.sendKey("o");
    session.sendKey("left");
    session.sendKey("i");

    expect(await session.waitForFrameText("│hi|o", { timeout: 2000 })).not.toBeNull();
    const linesAfterInsert = screenLines(session);

    expect(linesAfterInsert.some((line) => line.includes("│hi|o"))).toBe(true);
    expect(linesAfterInsert.some((line) => line.includes("Value: hio"))).toBe(true);
  });
});
