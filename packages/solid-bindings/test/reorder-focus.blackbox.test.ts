import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/reorder-focus.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

async function clickAndFocus(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseMove(col, row);
  await session.wait(100);
  session.click(col, row, MouseButton.Left);
  expect(
    await session.waitForTextConvergence("Focused id: beta", { timeout: 2000, settleMs: 100 }),
  ).not.toBeNull();
}

describe("reorder focus blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("focused item keeps keyboard focus after reorder when ids stay stable", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Alpha idle", 2000)).toBe(true);
    expect(await session.waitForText("Beta idle", 2000)).toBe(true);

    await clickAndFocus(session, 5, 7);

    expect(screenContainsRaw(session, "Beta FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Focused id: beta")).toBe(true);

    session.sendKey("r");
    expect(
      await session.waitForTextConvergence("Order: Gamma, Beta, Alpha", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    expect(screenContainsRaw(session, "Order: Gamma, Beta, Alpha")).toBe(true);
    expect(screenContainsRaw(session, "Beta FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Focused id: beta")).toBe(true);

    session.sendKey("x");
    expect(
      await session.waitForTextConvergence("Last key target: Beta", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    expect(screenContainsRaw(session, "Last key target: Beta")).toBe(true);
  });
});
