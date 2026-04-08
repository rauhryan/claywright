import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/async-computation-refresh.tsx", import.meta.url).pathname;

describe("async refresh blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 14, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("refresh keeps stale async value visible and preserves sibling focus", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Async value: Result 1", 2000)).toBe(true);

    session.mouseMove(5, 5);
    await session.wait(100);
    session.click(5, 5, MouseButton.Left);
    expect(
      await session.waitForTextConvergence("LEFT FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    expect(
      await session.waitForFrame(
        (frame) =>
          frame.screen.raw.includes("Pending: yes") &&
          frame.screen.raw.includes("Async value: Result 1"),
        { timeout: 2000 },
      ),
    ).not.toBeNull();

    expect(
      await session.waitForTextConvergence("Async value: Result 2", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
    expect(session.containsText("LEFT FOCUSED")).toBe(true);
    expect(session.containsText("Pending: no")).toBe(true);

    session.sendKey("x");
    expect(
      await session.waitForTextConvergence("Last key target: left", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });
});
