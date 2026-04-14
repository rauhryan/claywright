import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-focus.tsx", import.meta.url).pathname;

describe("buffer workspace regressions", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 76, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("main window scroll-to-end reveals the END row", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("ActiveWindow: main-window", 2000)).toBe(true);
    expect(await session.waitForText("BEGIN", 2000)).toBe(true);

    session.sendKey("tab");
    await session.wait(150);
    session.sendKey("end");

    const reachedEnd = await session.waitForConvergence(
      (screen) =>
        screen.raw.includes("ActiveWindow: main-window") &&
        screen.lines.some((line) => line.startsWith("│END")),
      {
        timeout: 2000,
        settleMs: 120,
      },
    );

    expect(reachedEnd).not.toBeNull();
  });

  test("floating window scroll-to-end reveals the END row inside the floating frame", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("ActiveWindow: main-window", 2000)).toBe(true);

    session.sendKey("tab");
    await session.wait(150);
    session.sendKey("]");
    expect(
      await session.waitForTextConvergence("ActiveWindow: floating-window", {
        timeout: 2000,
        settleMs: 120,
      }),
    ).not.toBeNull();

    session.sendKey("end");

    const reachedEnd = await session.waitForConvergence(
      (screen) =>
        screen.raw.includes("ActiveWindow: floating-window") &&
        screen.lines.slice(8, 13).some((line) => line.includes("│END")),
      {
        timeout: 2000,
        settleMs: 120,
      },
    );

    expect(reachedEnd).not.toBeNull();
  });

  test("floating content never renders below the floating frame", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("ActiveWindow: main-window", 2000)).toBe(true);
    expect(await session.waitForText("Float Row 1", 2000)).toBe(true);

    const settled = await session.waitForConvergence(
      (screen) => {
        const lowerRegion = screen.lines.slice(14).join("\n");
        return (
          !lowerRegion.includes("Float Row") &&
          !lowerRegion.includes("BEGIN") &&
          !lowerRegion.includes("END")
        );
      },
      {
        timeout: 2000,
        settleMs: 120,
      },
    );

    expect(settled).not.toBeNull();
  });
});
