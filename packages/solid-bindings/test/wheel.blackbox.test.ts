import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/wheel.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("wheel blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("wheel events update state when sent over the target box", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Wheel: none 0", 2000)).toBe(true);
    expect(await session.waitForText("Target box", 2000)).toBe(true);

    sendWheel(session, "down", 1, 2);
    expect(
      await session.waitForTextConvergence("Wheel: down@1,2 1", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    sendWheel(session, "up", 1, 2);
    expect(
      await session.waitForTextConvergence("Wheel: up@1,2 2", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("wheel events outside the target box do not update state", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Wheel: none 0", 2000)).toBe(true);

    sendWheel(session, "down", 30, 8);
    await session.wait(250);

    expect(session.getScreen().raw).toContain("Wheel: none 0");
  });
});
