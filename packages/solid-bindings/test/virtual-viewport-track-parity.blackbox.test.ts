import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-track-parity.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport track parity fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("left viewport without a track keeps focus, keyboard, wheel, and quit behavior", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Left viewport · no track", 2000)).toBe(true);
    expect(await session.waitForTextConvergence("L f=n c=n w=- s=0", { timeout: 2000, settleMs: 100 }))
      .not.toBeNull();

    session.mouseMove(2, 4);
    await session.wait(100);
    session.click(2, 4);
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("L f=y c=y w=- s=0"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    session.sendKey("pagedown");
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("L f=y c=y w=- s=9") && screen.raw.includes("Left Row 10"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    sendWheel(session, "down", 2, 4);
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("L f=y c=y w=d s=12") && screen.raw.includes("Left Row 13"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(1000)).toBe(0);
  });

  test("right viewport with a track keeps focus, keyboard, wheel, track updates, and quit behavior", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Right viewport · with track", 2000)).toBe(true);
    expect(
      await session.waitForTextConvergence("R f=n c=n w=- s=0 t=0/3", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.mouseMove(42, 4);
    await session.wait(100);
    session.click(42, 4);
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("R f=y c=y w=- s=0 t=0/3"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    session.sendKey("pagedown");
    expect(
      await session.waitForConvergence(
        (screen) =>
          screen.raw.includes("R f=y c=y w=- s=9 t=2/3") &&
          screen.raw.includes("Right Row 10") &&
          screen.raw.includes("█"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    sendWheel(session, "down", 42, 4);
    expect(
      await session.waitForConvergence(
        (screen) =>
          screen.raw.includes("R f=y c=y w=d s=12 t=3/3") &&
          screen.raw.includes("Right Row 13"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(1000)).toBe(0);
  });
});
