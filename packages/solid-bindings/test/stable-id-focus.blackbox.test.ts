import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/stable-id-focus.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

async function clickAndFocus(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseMove(col, row);
  await session.wait(100);
  session.click(col, row, MouseButton.Left);
  expect(
    await session.waitForTextConvergence("FOCUSED", { timeout: 2000, settleMs: 100 }),
  ).not.toBeNull();
}

describe("stable id focus blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("focus survives conditional rerender when explicit id is stable", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Click to focus", 2000)).toBe(true);

    await clickAndFocus(session, 5, 5);

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner: off")).toBe(true);

    session.sendKey("b");
    expect(
      await session.waitForTextConvergence("Banner: on", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner visible")).toBe(true);
    expect(screenContainsRaw(session, "Banner: on")).toBe(true);

    session.sendKey("b");
    expect(
      await session.waitForTextConvergence("Banner: off", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner: off")).toBe(true);
  });
});
