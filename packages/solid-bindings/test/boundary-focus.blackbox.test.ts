import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/boundary-focus-preservation.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

async function clickAndFocus(session: TerminalSession, col: number, row: number): Promise<void> {
  session.mouseMove(col, row);
  await session.wait(100);
  session.click(col, row, MouseButton.Left);
}

describe("boundary focus blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("focused sibling keeps focus across Errored fallback swap", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Boundary Focus Preservation", 2000)).toBe(true);

    await clickAndFocus(session, 5, 5);
    expect(
      await session.waitForTextConvergence("LEFT FOCUSED", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.sendKey("e");

    expect(await session.waitForText("Errored fallback", 2000)).toBe(true);
    expect(screenContainsRaw(session, "LEFT FOCUSED")).toBe(true);

    session.sendKey("x");
    expect(
      await session.waitForTextConvergence("Last key target: left", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });
});
