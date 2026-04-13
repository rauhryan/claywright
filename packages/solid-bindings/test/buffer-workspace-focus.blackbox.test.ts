import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-focus.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

function extractMetric(screen: string, label: string): number | null {
  const match = screen.match(new RegExp(`${label}: (\\d+)`));
  return match ? Number(match[1]) : null;
}

describe("buffer workspace focus manager", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 76, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("workspace keyboard focus manager cycles the active window and PageDown scrolls only that window", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("ActiveWindow: main-window", 2000)).toBe(true);
    expect(await session.waitForText("MainTopRow: 1", 2000)).toBe(true);
    expect(await session.waitForText("FloatTopRow: 1", 2000)).toBe(true);

    session.sendKey("tab");
    await session.wait(150);
    session.sendKey("pagedown");

    const mainScrolled = await session.waitForConvergence(
      (screen) => {
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          screen.raw.includes("ActiveWindow: main-window") &&
          mainTop !== null &&
          mainTop > 1 &&
          floatTop === 1
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );
    expect(mainScrolled).not.toBeNull();

    const mainTopAfter = extractMetric(mainScrolled!.raw, "MainTopRow");
    expect(mainTopAfter).not.toBeNull();

    session.sendKey("]");
    const focusedFloating = await session.waitForTextConvergence("ActiveWindow: floating-window", {
      timeout: 2000,
      settleMs: 120,
    });
    expect(focusedFloating).not.toBeNull();

    session.sendKey("pagedown");
    const floatingScrolled = await session.waitForConvergence(
      (screen) => {
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          screen.raw.includes("ActiveWindow: floating-window") &&
          mainTop === mainTopAfter &&
          floatTop !== null &&
          floatTop > 1
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );
    expect(floatingScrolled).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });

  test("wheel over the floating window scrolls only the floating window", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("MainTopRow: 1", 2000)).toBe(true);
    expect(await session.waitForText("FloatTopRow: 1", 2000)).toBe(true);

    sendWheel(session, "down", 30, 9);
    const scrolled = await session.waitForConvergence(
      (screen) => {
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          screen.raw.includes("ActiveWindow: floating-window") &&
          mainTop === 1 &&
          floatTop !== null &&
          floatTop > 1
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );
    expect(scrolled).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });
});
