import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const streamFixture = new URL("./fixtures/async-iterable-stream.tsx", import.meta.url).pathname;
const cancelFixture = new URL("./fixtures/async-iterable-unmount-cancel.tsx", import.meta.url)
  .pathname;

describe("async iterable blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 12, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("streamed updates appear in order while siblings remain stable", async () => {
    await session.spawn("bun", [streamFixture]);

    expect(await session.waitForFrameText("Stream: one", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForFrameText("Stream: two", { timeout: 2000 })).not.toBeNull();
    expect(
      await session.waitForTextConvergence("Stream: three", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();
    expect(session.containsText("Sibling stable")).toBe(true);
  });

  test("unmounted async iterable branch does not render later updates", async () => {
    await session.spawn("bun", [cancelFixture]);

    expect(await session.waitForFrameText("Stream: one", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForFrameText("Stream: two", { timeout: 2000 })).not.toBeNull();
    expect(await session.waitForText("Unmounted", 2000)).toBe(true);

    await session.wait(200);

    expect(session.containsText("Stream: three")).toBe(false);
    expect(session.containsText("Sibling stable")).toBe(true);
  });
});
