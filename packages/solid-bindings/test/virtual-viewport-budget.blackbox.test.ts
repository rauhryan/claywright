import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-budget.tsx", import.meta.url).pathname;

describe("virtual viewport budget fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 60, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("reports budget exceeded while keeping visible rows rendered", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Budget Demo", 2000)).toBe(true);
    expect(
      await session.waitForTextConvergence("budget=yes", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    const screen = session.getScreen().raw;
    expect(screen).toContain("Budget Row 1");
    expect(screen).toContain("Budget Row 2");
    expect(screen).toContain("Budget Row 3");
  });
});
