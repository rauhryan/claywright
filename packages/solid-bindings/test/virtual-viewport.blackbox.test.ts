import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 50, cwd: process.cwd(), rows: 14 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders initial rows", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Virtual Viewport Demo", 2000)).toBe(true);
    expect(await session.waitForText("Row 1", 2000)).toBe(true);
    expect(await session.waitForText("scroll=0", 2000)).toBe(true);
  });

  test("wheel over the viewport updates scroll state", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("scroll=0", 2000)).toBe(true);
    expect(await session.waitForText("Row 1", 2000)).toBe(true);

    sendWheel(session, "down", 1, 5);

    expect(
      await session.waitForTextConvergence("scroll=3", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(await session.waitForFrameText("wheel=yes", { timeout: 2000 })).not.toBeNull();
  });
});
