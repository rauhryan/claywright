import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/click-counter.tsx", import.meta.url).pathname;

describe("click counter blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("clicking box increments counter", async () => {
    session.startFrameCapture();
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Count: 0", 2000)).toBe(true);

    session.mouseMove(5, 3);
    await session.wait(100);
    session.click(5, 3, MouseButton.Left);

    const nextFrame = await session.waitForFrameText("Count: 1", { timeout: 1000 });
    if (!nextFrame) {
      const frames = session.getFrames().map((frame) => frame.screen.raw);
      expect(frames).toContain("Count: 1");
    }

    expect(await session.waitForText("Count: 1", 2000)).toBe(true);
  });
});
