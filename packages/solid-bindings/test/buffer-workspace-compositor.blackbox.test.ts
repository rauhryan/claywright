import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/buffer-workspace-compositor.tsx", import.meta.url).pathname;

function sendWheel(
  session: TerminalSession,
  direction: "up" | "down",
  col: number,
  row: number,
): void {
  const code = direction === "up" ? 64 : 65;
  session.sendInput(`\x1b[<${code};${col + 1};${row + 1}M`);
}

describe("buffer workspace compositor", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, cwd: process.cwd(), rows: 18 });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("clicks in the overlapping region go to the floating window instead of the docked window", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("MainStatus: idle", 2000)).toBe(true);
    expect(await session.waitForText("FloatStatus: idle", 2000)).toBe(true);
    expect(await session.waitForText("BEGIN", 2000)).toBe(true);
    expect(await session.waitForText("Main Row 1", 2000)).toBe(true);
    expect(await session.waitForText("Float Row 1", 2000)).toBe(true);

    session.mouseMove(22, 9);
    await session.wait(100);
    session.click(22, 9);

    expect(
      await session.waitForTextConvergence("FloatStatus: click@0,0", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
    expect(session.getScreen().raw).toContain("MainStatus: idle");

    session.mouseMove(4, 10);
    await session.wait(100);
    session.click(4, 10);

    expect(
      await session.waitForTextConvergence("MainStatus: click@0,0", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();
  });

  test("wheel events route to the topmost eligible window and q exits cleanly", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("MainStatus: idle", 2000)).toBe(true);
    expect(await session.waitForText("FloatStatus: idle", 2000)).toBe(true);

    sendWheel(session, "down", 22, 9);
    const floatScrolled = await session.waitForConvergence(
      (screen) =>
        screen.raw.includes("FloatStatus: wheel:down@22,9") &&
        screen.raw.includes("MainStatus: idle") &&
        screen.raw.includes("Main Row 1") &&
        screen.raw.includes("Float Row 3"),
      {
        timeout: 2000,
        settleMs: 100,
      },
    );
    expect(floatScrolled).not.toBeNull();

    sendWheel(session, "down", 4, 10);
    expect(
      await session.waitForTextConvergence("MainStatus: wheel:down@4,10", {
        timeout: 2000,
        settleMs: 100,
      }),
    ).not.toBeNull();

    session.sendKey("q");
    expect(await session.waitForExit(2000)).toBe(0);
  });
});
