import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/tab-navigation.tsx", import.meta.url).pathname;

function screenLines(session: TerminalSession): string[] {
  return session.getScreen().lines;
}

async function tabAndSettle(session: TerminalSession): Promise<void> {
  session.sendKey("tab");
  expect(
    await session.waitForTextConvergence("yes", { timeout: 2000, settleMs: 100 }),
  ).not.toBeNull();
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

    await tabAndSettle(session);
    let lines = screenLines(session);
    expect(lines.some((line) => line.includes("|First"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    await tabAndSettle(session);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Second"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    await tabAndSettle(session);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Third"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);

    await tabAndSettle(session);
    lines = screenLines(session);
    expect(lines.some((line) => line.includes("|First"))).toBe(true);
  });

  test("shift+tab cycles focus backward", async () => {
    await session.spawn("bun", [fixture]);

    await tabAndSettle(session);

    session.write("\x1b[9;2u");
    expect(
      await session.waitForTextConvergence("|Third", { timeout: 2000, settleMs: 100 }),
    ).not.toBeNull();

    const lines = screenLines(session);
    expect(lines.some((line) => line.includes("|Third"))).toBe(true);
    expect(lines.some((line) => line.trim() === "yes")).toBe(true);
  });
});
