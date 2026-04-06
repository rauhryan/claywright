import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/tab-navigation.tsx", import.meta.url).pathname;

function screenLines(session: TerminalSession): string[] {
  return session.getScreen().lines;
}

describe("tab navigation blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, cwd: process.cwd(), rows: 14 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("tab cycles focus through inputs", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Tab Navigation Demo", 2000)).toBe(true);

    session.sendKey("tab");
    await session.wait(200);
    let lines = screenLines(session);
    expect(lines.some((line) => line.includes("|First"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    session.sendKey("tab");
    await session.wait(200);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Second"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    session.sendKey("tab");
    await session.wait(200);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Third"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    session.sendKey("tab");
    await session.wait(200);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|First"))).toBe(true);
  });

  test("shift+tab cycles focus backward", async () => {
    await session.spawn("bun", [fixture]);

    session.sendKey("tab");
    await session.wait(200);

    session.write("\x1b[9;2u");
    await session.wait(200);

    const lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Third"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);
  });
});
