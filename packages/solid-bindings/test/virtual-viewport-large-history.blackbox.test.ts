import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-large-history.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport large history fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 60, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders a large history while keeping the viewport responsive", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Large History Demo", 2000)).toBe(true);
    expect(await session.waitForText("content=10000", 2000)).toBe(true);
    expect(await session.waitForText("History Row 1", 2000)).toBe(true);

    sendWheel(session, "down", 1, 4);
    expect(
      await session.waitForTextConvergence("scroll=3", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(await session.waitForText("History Row 4", 2000)).toBe(true);
  });
});
