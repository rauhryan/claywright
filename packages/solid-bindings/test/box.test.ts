import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/box.tsx", import.meta.url).pathname;

describe("box element", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 10, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("renders box with children", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Header", 2000)).toBe(true);
    expect(await session.waitForText("Hello World", 2000)).toBe(true);
  });
});
