import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-authored-inspector.tsx", import.meta.url)
  .pathname;

function extractMetric(screen: string, label: string): number | null {
  const match = screen.match(new RegExp(`${label}: (\\d+)`));
  return match ? Number(match[1]) : null;
}

function extractAppended(screen: string): number | null {
  const match = screen.match(/appended: (\d+)/);
  return match ? Number(match[1]) : null;
}

function extractInspectorAppended(screen: string): number | null {
  const match = screen.match(/Inspector appended: (\d+)/);
  return match ? Number(match[1]) : null;
}

describe("buffer workspace authored inspector", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 84, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("external shared stream windows stay stable while the authored inspector buffer updates", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Authored workspace demo", 2000)).toBe(true);
    expect(await session.waitForText("MainTopRow: 1", 2000)).toBe(true);
    expect(await session.waitForText("FloatTopRow:", 2000)).toBe(true);
    expect(await session.waitForText("BEGIN", 2000)).toBe(true);
    expect(await session.waitForText("Inspector appended: 0", 2000)).toBe(true);

    expect(await session.waitForText("Inspector appended: 3", 3500)).toBe(true);
    expect(await session.waitForText("Tail Row 3", 3500)).toBe(true);

    const screen = session.getScreen().raw;
    expect(extractAppended(screen)).not.toBeNull();
    expect(extractAppended(screen) ?? 0).toBeGreaterThanOrEqual(3);
    expect(extractInspectorAppended(screen)).not.toBeNull();
    expect(extractInspectorAppended(screen) ?? 0).toBeGreaterThanOrEqual(3);
    expect(extractMetric(screen, "MainTopRow")).toBe(1);
    expect(extractMetric(screen, "FloatTopRow") ?? 0).toBeGreaterThan(1);

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });
});
