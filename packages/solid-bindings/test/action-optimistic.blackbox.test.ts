import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const clickFixture = new URL("./fixtures/action-optimistic-click.tsx", import.meta.url).pathname;
const keyboardFixture = new URL("./fixtures/action-optimistic-keyboard.tsx", import.meta.url)
  .pathname;

describe("action optimistic blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 12, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("click action shows optimistic value then settles to server value", async () => {
    await session.spawn("bun", [clickFixture]);

    expect(await session.waitForText("Todo: server-0", 2000)).toBe(true);

    session.mouseMove(5, 3);
    await session.wait(100);
    session.click(5, 3, MouseButton.Left);

    expect(await session.waitForFrameText("Todo: optimistic", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Todo: server-1", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("keyboard action preserves input focus and cursor while settling", async () => {
    await session.spawn("bun", [keyboardFixture]);

    expect(await session.waitForText("Keyboard Action Demo", 2000)).toBe(true);

    session.sendKey("tab");
    expect(
      await session.waitForTextConvergence("server|", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.sendKey("s");
    expect(
      await session.waitForTextConvergence("saved|", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });
});
