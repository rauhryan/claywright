import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-auto-follow.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("virtual viewport auto-follow", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("streaming items keep follow enabled until the user scrolls away, then End restores it", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Auto-Follow Demo", 2000)).toBe(true);
    expect(await session.waitForTextConvergence("items=30", { timeout: 2000, settleMs: 100 })).not.toBeNull();
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("follow=yes") && /scroll=\d+/.test(screen.raw) && !screen.raw.includes("scroll=0"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("end=yes");

    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("items=31") && screen.raw.includes("tail=row-31@v1"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("items=31") && screen.raw.includes("tail=row-31@v2"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("follow=yes");

    sendWheel(session, "up", 1, 4);
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("follow=no") && screen.raw.includes("event=wheel:up@1,4"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();

    session.click(1, 4);
    session.sendKey("end");
    expect(
      await session.waitForConvergence(
        (screen) => screen.raw.includes("follow=yes") && screen.raw.includes("end=yes"),
        { timeout: 2000, settleMs: 100 },
      ),
    ).not.toBeNull();
  });
});
