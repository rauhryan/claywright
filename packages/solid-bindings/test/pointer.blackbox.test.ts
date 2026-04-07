import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/pointer.tsx", import.meta.url).pathname;

describe("pointer blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("updates pointer position and button state after mount", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Pointer: (-1, -1) UP", 2000)).toBe(true);

    session.mouseMove(5, 3);
    expect(await session.waitForText("Pointer: (5, 3) UP", 2000)).toBe(true);

    session.mouseDown(5, 3, MouseButton.Left);
    expect(await session.waitForText("Pointer: (5, 3) DOWN", 2000)).toBe(true);

    session.mouseMove(8, 4);
    expect(await session.waitForText("Pointer: (8, 4) DOWN", 2000)).toBe(true);

    session.mouseUp(8, 4, MouseButton.Left);
    expect(await session.waitForText("Pointer: (8, 4) UP", 2000)).toBe(true);
  });
});
