import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type ScreenSnapshot, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-track.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

function trackPattern(screen: ScreenSnapshot): string {
  return screen.lines.slice(2, 10).map((line) => line.at(-1) ?? " ").join("");
}

function visibleRows(screen: ScreenSnapshot): string[] {
  return screen.lines
    .slice(2, 10)
    .map((line) => line.match(/Row \d+/)?.[0] ?? "");
}

describe("virtual viewport scroll track fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 50, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("keyboard and wheel input keep the track and visible content in sync", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Scroll Track Demo", 2000)).toBe(true);
    expect(await session.waitForTextConvergence("scroll=0", { timeout: 2000, settleMs: 100 }))
      .not.toBeNull();
    expect(await session.waitForText("Row 1", 2000)).toBe(true);

    const before = session.getScreen();
    const beforePattern = trackPattern(before);
    expect(before.raw).toContain("thumb=0/1");
    expect(visibleRows(before)).toEqual([
      "Row 1",
      "Row 2",
      "Row 3",
      "Row 4",
      "Row 5",
      "Row 6",
      "Row 7",
      "Row 8",
    ]);

    session.mouseMove(1, 4);
    await session.wait(100);
    session.click(1, 4);
    await session.wait(100);
    session.sendKey("pagedown");

    expect(
      await session.waitForConvergence(
        (screen) =>
          screen.raw.includes("scroll=7") &&
          screen.raw.includes("key:PageDown") &&
          visibleRows(screen)[0] === "Row 8",
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    sendWheel(session, "down", 1, 4);
    await session.wait(150);
    sendWheel(session, "down", 1, 4);

    expect(
      await session.waitForConvergence(
        (screen) =>
          screen.raw.includes("scroll=13") &&
          screen.raw.includes("evt=d@1,4") &&
          visibleRows(screen)[0] === "Row 14",
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    const after = session.getScreen();
    const afterPattern = trackPattern(after);
    expect(afterPattern).not.toBe(beforePattern);
    expect(visibleRows(after)).toEqual([
      "Row 14",
      "Row 15",
      "Row 16",
      "Row 17",
      "Row 18",
      "Row 19",
      "Row 20",
      "Row 21",
    ]);
  });
});
