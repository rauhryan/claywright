import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-transcript-collapse.tsx", import.meta.url).pathname;

describe("virtual viewport transcript collapse fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("click toggle works and q exits cleanly even with the inline track present", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Transcript Collapse Demo", 2000)).toBe(true);
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("collapsed=no") && screen.raw.includes("revision=1"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("Click to collapse");

    session.mouseMove(5, 3);
    await session.wait(100);
    session.click(5, 3);

    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("collapsed=yes") && screen.raw.includes("via=click"),
        { timeout: 3000, settleMs: 100 },
      ),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("Click to expand");
    expect(session.getScreen().raw).toContain("thumb=");

    session.sendKey("q");
    expect(await session.waitForExit(1000)).toBe(0);
  });
});
