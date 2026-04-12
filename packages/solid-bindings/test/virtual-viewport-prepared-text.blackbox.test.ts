import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/virtual-viewport-prepared-text.tsx", import.meta.url).pathname;

describe("virtual viewport prepared text fixture", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 60, cwd: process.cwd(), rows: 10 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders wrapped prepared-text items through the viewport", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Virtual Viewport Prepared Text Demo", 2000)).toBe(true);
    expect(await session.waitForText("content=", 2000)).toBe(true);
    const screen = session.getScreen().raw;
    expect(screen).toContain("Prepared text item one wraps");
    expect(screen).toContain("ANSI demo: SELECT");
  });
});
