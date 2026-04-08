import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/action-generator-progress.tsx", import.meta.url).pathname;

describe("action generator blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 12, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("generator action paints queued, saving, and done in order", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Stage: idle", 2000)).toBe(true);

    session.mouseMove(5, 5);
    await session.wait(100);
    session.click(5, 5, MouseButton.Left);

    expect(await session.waitForFrameText("Stage: queued", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForFrameText("Stage: saving", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Stage: done", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("generator rollback returns to idle after failure", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Stage: idle", 2000)).toBe(true);

    session.mouseMove(25, 5);
    await session.wait(100);
    session.click(25, 5, MouseButton.Left);

    expect(await session.waitForFrameText("Stage: queued", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForFrameText("Stage: saving", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Stage: idle", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });
});
