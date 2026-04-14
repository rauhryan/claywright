import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-text-stream.tsx", import.meta.url).pathname;

function extractMetric(screen: string, label: string): number | null {
  const match = screen.match(new RegExp(`${label}: (\\d+)`));
  return match ? Number(match[1]) : null;
}

function extractAppended(screen: string): number | null {
  const match = screen.match(/appended: (\d+)/);
  return match ? Number(match[1]) : null;
}

describe("buffer workspace text stream", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 76, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("shared stream starts with independent main and floating window positions", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Shared TextStreamBuffer demo", 2000)).toBe(true);
    expect(await session.waitForText("MainTopRow: 1", 2000)).toBe(true);
    expect(await session.waitForText("BEGIN", 2000)).toBe(true);
    expect(await session.waitForText("Stream Row 1", 2000)).toBe(true);

    const initial = await session.waitForConvergence(
      (screen) => {
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          mainTop === 1 &&
          floatTop !== null &&
          floatTop > 20 &&
          screen.raw.includes("Stream Row 1") &&
          screen.raw.includes("Stream Row 8")
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );

    expect(initial).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });

  test("floating tail preview auto-follows appended stream rows while main stays pinned", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Shared TextStreamBuffer demo", 2000)).toBe(true);
    expect(await session.waitForText("MainTopRow: 1", 2000)).toBe(true);
    expect(await session.waitForText("FloatTopRow:", 2000)).toBe(true);
    expect(await session.waitForText("BEGIN", 2000)).toBe(true);
    expect(await session.waitForText("Stream Row 1", 2000)).toBe(true);

    const settled = await session.waitForConvergence(
      (screen) => {
        const appended = extractAppended(screen.raw);
        const mainTop = extractMetric(screen.raw, "MainTopRow");
        const floatTop = extractMetric(screen.raw, "FloatTopRow");
        return (
          appended !== null &&
          appended >= 3 &&
          mainTop === 1 &&
          floatTop !== null &&
          floatTop > 1 &&
          screen.raw.includes("Tail Row")
        );
      },
      {
        timeout: 3000,
        settleMs: 150,
      },
    );

    expect(settled).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });
});
