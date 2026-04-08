import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/async-computation-first-resolve.tsx", import.meta.url).pathname;

describe("async computation blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 12, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("async store first resolve shows Loading fallback then resolved content", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Sibling stable", 2000)).toBe(true);
    expect(await session.waitForFrameText("Loading fallback", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Async value: Resolved async store", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
    expect(session.containsText("Sibling stable")).toBe(true);
  });
});
