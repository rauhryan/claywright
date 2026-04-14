import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-authored-main-follow.tsx", import.meta.url)
  .pathname;

function extractMetric(screen: string, label: string): number | null {
  const match = screen.match(new RegExp(`${label}: (\\d+)`));
  return match ? Number(match[1]) : null;
}

function extractAppended(screen: string): number | null {
  const match = screen.match(/appended: (\d+)/);
  return match ? Number(match[1]) : null;
}

describe("buffer workspace authored main follow", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 84, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("docked main stream boots at the tail and keeps following appended rows", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Authored main-follow demo", 2000)).toBe(true);
    expect(await session.waitForText("Mode: follow=yes", 2000)).toBe(true);
    expect(await session.waitForText("Floating tail preview", 2000)).toBe(true);
    expect(await session.waitForText("Stream Row 100", 2000)).toBe(true);

    const initial = await session.waitForConvergence(
      (screen) => {
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          mainTop !== null &&
          mainTop >= 90 &&
          floatTop !== null &&
          floatTop > mainTop &&
          screen.raw.includes("Stream Row 100")
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );

    expect(initial).not.toBeNull();

    expect(await session.waitForText("Tail Row 2", 3000)).toBe(true);
    const screen = session.getScreen().raw;
    const mainTop = extractMetric(screen, "MainTopRow") ?? 0;
    const floatTop = extractMetric(screen, "FloatTopRow") ?? 0;
    expect(extractAppended(screen) ?? 0).toBeGreaterThanOrEqual(2);
    expect(mainTop).toBeGreaterThanOrEqual(91);
    expect(floatTop).toBeGreaterThan(mainTop);
    expect(screen).toContain("Tail Row 2");

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });
});
