import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/input.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

function screenLines(session: TerminalSession): string[] {
  return session.getScreen().lines;
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

    session.mouseMove(inputCol, inputRow);
    await session.wait(100);
    session.click(inputCol, inputRow, MouseButton.Left);
    await session.wait(100);

    await session.wait(300);
    const linesAfterFocus = screenLines(session);
    expect(linesAfterFocus.some((line) => line.includes("|Type here"))).toBe(true);
    expect(linesAfterFocus.some((line) => line.trim() === "yes")).toBe(true);
    expect(linesAfterFocus.some((line) => line.includes("v sible"))).toBe(true);

    session.sendKey("h");
    session.sendKey("i");

    await session.wait(300);
    const linesAfterTyping = screenLines(session);
    expect(linesAfterTyping.some((line) => line.includes("│hi"))).toBe(true);
    expect(linesAfterTyping.some((line) => line.trim() === "hi")).toBe(true);
  });

  test("supports backspace", async () => {
    await session.spawn("bun", [fixture]);

    const inputCol = 3;
    const inputRow = 2;

    session.mouseMove(inputCol, inputRow);
    await session.wait(100);
    session.click(inputCol, inputRow, MouseButton.Left);
    await session.wait(100);

    session.sendKey("h");
    session.sendKey("i");
    session.sendKey("backspace");

    await session.wait(300);
    const linesAfterBackspace = screenLines(session);
    expect(linesAfterBackspace.some((line) => line.includes("│h|"))).toBe(true);
    expect(linesAfterBackspace.some((line) => line.trim() === "h")).toBe(true);
  });

  test("supports arrow navigation and insertion", async () => {
    await session.spawn("bun", [fixture]);

    const inputCol = 3;
    const inputRow = 2;

    session.mouseMove(inputCol, inputRow);
    await session.wait(100);
    session.click(inputCol, inputRow, MouseButton.Left);
    await session.wait(100);

    session.sendKey("h");
    session.sendKey("o");
    session.sendKey("left");
    session.sendKey("i");

    await session.wait(300);
    const linesAfterInsert = screenLines(session);
    expect(linesAfterInsert.some((line) => line.includes("│hi|o"))).toBe(true);
    expect(linesAfterInsert.some((line) => line.trim() === "hio")).toBe(true);
  });
});
