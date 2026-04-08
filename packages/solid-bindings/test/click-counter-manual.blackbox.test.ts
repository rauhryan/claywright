import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/click-counter-manual.ts", import.meta.url).pathname;

describe("click counter blackbox manual", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("clicking box increments counter", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Count: 0", 2000)).toBe(true);

    session.mouseMove(5, 3);
    await session.wait(100);
    session.click(5, 3, MouseButton.Left);

    expect(await session.waitForText("Count: 1", 2000)).toBe(true);
  });
});
