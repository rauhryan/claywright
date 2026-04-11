import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/mouse-events.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("mouse events blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("normal box receives mousemove, mousedown, mouseup, click, and wheel", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Mouse Events Demo", 2000)).toBe(true);
    expect(await session.waitForText("Status: idle", 2000)).toBe(true);

    session.mouseMove(1, 3);
    expect(
      await session.waitForTextConvergence("Status: mv@1,3", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.mouseDown(1, 3);
    expect(
      await session.waitForTextConvergence("Status: mv@1,3 | down", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    session.mouseUp(1, 3);
    expect(
      await session.waitForConvergence(
        (screen) =>
          screen.raw.includes("Status: mv@1,3") &&
          screen.raw.includes("down") &&
          screen.raw.includes("up") &&
          screen.raw.includes("click"),
        {
          timeout: 2000,
          settleMs: 100,
        },
      ),
    ).not.toBeNull();

    sendWheel(session, "down", 1, 3);
    expect(
      await session.waitForTextConvergence("Status: mv@1,3 | down | click | up | wh:d@1,3", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });
});
