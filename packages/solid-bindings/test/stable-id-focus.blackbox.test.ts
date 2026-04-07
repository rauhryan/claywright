import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/stable-id-focus.tsx", import.meta.url).pathname;

function screenContainsRaw(session: TerminalSession, text: string): boolean {
  return session.getScreen().raw.includes(text);
}

describe("stable id focus blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("focus survives conditional rerender when explicit id is stable", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Click to focus", 2000)).toBe(true);

    session.mouseMove(5, 5);
    await session.wait(100);
    session.click(5, 5, MouseButton.Left);
    await session.wait(300);

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner: off")).toBe(true);

    session.sendKey("b");
    await session.wait(300);

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner visible")).toBe(true);
    expect(screenContainsRaw(session, "Banner: on")).toBe(true);

    session.sendKey("b");
    await session.wait(300);

    expect(screenContainsRaw(session, "FOCUSED")).toBe(true);
    expect(screenContainsRaw(session, "Banner: off")).toBe(true);
  });
});
