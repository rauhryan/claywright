import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

// Vertical 02 spec locks: skipped until Loading/Errored boundary semantics land.

const loadingFixture = new URL("./fixtures/loading-first-resolve.tsx", import.meta.url).pathname;
const staleFixture = new URL("./fixtures/loading-stale-refresh.tsx", import.meta.url).pathname;
const erroredFixture = new URL("./fixtures/errored-reset.tsx", import.meta.url).pathname;

describe("boundary blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("Loading shows fallback first and then resolved content while siblings remain present", async () => {
    await session.spawn("bun", [loadingFixture]);

    expect(await session.waitForText("Sibling stable", 2000)).toBe(true);
    expect(await session.waitForFrameText("Loading fallback", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Resolved content", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    expect(session.containsText("Sibling stable")).toBe(true);
  });

  test("Loading stale-refresh fixture expresses pending and latest semantics without dropping siblings", async () => {
    await session.spawn("bun", [staleFixture]);

    expect(await session.waitForText("Sibling stable", 2000)).toBe(true);
    expect(await session.waitForText("Pending: no", 2000)).toBe(true);
    expect(await session.waitForText("Latest: Result 1", 2000)).toBe(true);

    expect(await session.waitForFrameText("Pending: yes", { timeout: 2000 })).not.toBeNull();
    expect(session.containsText("Latest: Result 1")).toBe(true);

    expect(
      await session.waitForTextConvergence("Latest: Result 2", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(session.containsText("Pending: no")).toBe(true);
    expect(session.containsText("Sibling stable")).toBe(true);
  });

  test("Errored swaps to fallback on throw and can be reset while siblings remain stable", async () => {
    await session.spawn("bun", [erroredFixture]);

    expect(await session.waitForText("Sibling stable", 2000)).toBe(true);
    expect(await session.waitForText("Healthy content", 2000)).toBe(true);

    session.mouseMove(5, 4);
    await session.wait(200);
    session.click(5, 4, MouseButton.Left);

    expect(await session.waitForText("Attempt: 1", 2000)).toBe(true);
    expect(await session.waitForText("Errored fallback", 2000)).toBe(true);
    expect(session.containsText("Sibling stable")).toBe(true);

    session.sendKey("r");
    expect(await session.waitForText("Healthy content", 2000)).toBe(true);
    expect(session.containsText("Sibling stable")).toBe(true);
  });
});
