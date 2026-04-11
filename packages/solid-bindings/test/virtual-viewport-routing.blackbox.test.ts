import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-routing.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport routing blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("normal box receives click", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Box: idle", 2000)).toBe(true);

    session.mouseMove(1, 4);
    await session.wait(100);
    session.click(1, 4);
    expect(
      await session.waitForTextConvergence("Box: click", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("normal box receives wheel", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Box: idle", 2000)).toBe(true);

    sendWheel(session, "down", 1, 4);
    expect(
      await session.waitForTextConvergence("Box: wheel:down@1,4", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });

  test("virtual viewport receives click", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Viewport: idle", 2000)).toBe(true);

    session.mouseMove(1, 7);
    await session.wait(100);
    session.click(1, 7);
    expect(
      await session.waitForTextConvergence("Viewport: click", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("virtual viewport receives wheel", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Viewport: idle", 2000)).toBe(true);

    sendWheel(session, "down", 1, 7);
    expect(
      await session.waitForTextConvergence("Viewport: wheel:down@1,7", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });
});
