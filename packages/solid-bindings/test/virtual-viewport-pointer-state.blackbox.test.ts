import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-pointer-state.tsx", import.meta.url).pathname;

describe("virtual viewport pointer state", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("pointer coordinates still update with VirtualViewport present", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Pointer: (-1, -1) UP", 2000)).toBe(true);

    session.mouseMove(1, 4);
    expect(
      await session.waitForTextConvergence("Pointer: (1, 4) UP", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.mouseDown(1, 4);
    expect(
      await session.waitForTextConvergence("Pointer: (1, 4) DOWN", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    session.mouseUp(1, 4);
    expect(
      await session.waitForTextConvergence("Pointer: (1, 4) UP", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("raw wheel updates pointer coordinates with VirtualViewport present", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Pointer: (-1, -1) UP", 2000)).toBe(true);

    session.sendInput("\x1b[<65;2;5M");
    expect(
      await session.waitForTextConvergence("Pointer: (1, 4) UP", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });
});
