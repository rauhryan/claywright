import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-events.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport event delivery", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("mousedown and click over the viewport update visible state", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Viewport Events Demo", 2000)).toBe(true);
    expect(await session.waitForText("Status: idle", 2000)).toBe(true);
    expect(await session.waitForText("Row 1", 2000)).toBe(true);

    session.mouseMove(1, 5);
    await session.wait(100);
    session.mouseDown(1, 5);
    expect(
      await session.waitForTextConvergence("Status: mousedown", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.mouseUp(1, 5);
    expect(
      await session.waitForTextConvergence("Status: click", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
  });

  test("wheel over the viewport updates visible state", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Status: idle", 2000)).toBe(true);

    sendWheel(session, "down", 1, 5);
    expect(
      await session.waitForTextConvergence("Status: wheel:down@1,5", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    sendWheel(session, "up", 1, 5);
    expect(
      await session.waitForTextConvergence("Status: wheel:up@1,5", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });

  test("wheel outside the viewport does not update visible state", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Status: idle", 2000)).toBe(true);

    sendWheel(session, "down", 30, 8);
    await session.wait(250);

    expect(session.getScreen().raw).toContain("Status: idle");
  });
});
