import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-geometry.tsx", import.meta.url).pathname;

describe("virtual viewport geometry fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 50, cwd: process.cwd(), rows: 12 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("reports parent-constrained viewport height after geometry bootstrap", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Geometry Demo", 2000)).toBe(true);
    expect(
      await session.waitForTextConvergence("viewport=9", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("Geometry Row 9");
  });

  test("recomputes viewport geometry after a terminal resize", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Geometry Demo", 2000)).toBe(true);
    expect(
      await session.waitForTextConvergence("viewport=9", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    session.resize(50, 16);

    expect(
      await session.waitForTextConvergence("viewport=13", { timeout: 3000, settleMs: 100 }),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("Geometry Row 13");
  });
});
