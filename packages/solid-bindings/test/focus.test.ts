import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/focus.tsx", import.meta.url).pathname;

describe("focus system", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 10, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders focusable element", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Click to focus", 2000)).toBe(true);
  });
});
