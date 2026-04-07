import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/focus-demo.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

async function clickAndSettle(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseMove(col, row);
  await session.wait(100);
  session.click(col, row, MouseButton.Left);
}

describe("focus blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("clicking a focusable box updates the UI", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Click to focus", 2000)).toBe(true);

    await clickAndSettle(session, 5, 3);
    expect(
      await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
  });

  test("clicking outside a focused box blurs it", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Click to focus", 2000)).toBe(true);

    await clickAndSettle(session, 5, 3);
    expect(
      await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);

    await clickAndSettle(session, 50, 10);
    expect(
      await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(screenContainsRaw(session, "Click to focus")).toBe(false);
    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
  });

  test("dragging off a focused box does not blur it", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Click to focus", 2000)).toBe(true);

    await clickAndSettle(session, 5, 3);
    expect(
      await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);

    session.mouseDown(5, 3, MouseButton.Left);
    await session.wait(100);
    session.mouseMove(50, 10);
    await session.wait(100);
    session.mouseUp(50, 10, MouseButton.Left);

    expect(
      await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
  });
});
