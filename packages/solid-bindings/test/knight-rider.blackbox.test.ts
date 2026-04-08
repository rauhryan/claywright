import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSession, MouseButton, type TerminalSession } from "@tui/test-harness";

const fixture = new URL("./fixtures/knight-rider.tsx", import.meta.url).pathname;

const BAR_ROW = 3;
const BAR_COL = 4;

function cellPalette(session: TerminalSession, col: number, row: number): number {
  return session.getCellStyle(col, row).bg.palette;
}

describe("knight rider blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 16, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  test("renders idle scanner bar with inactive color", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("Start", 3000)).toBe(true);
    expect(await session.waitForText("paused", 1000)).toBe(true);

    const bgPalette = cellPalette(session, 0, 0);
    const squarePalette = cellPalette(session, BAR_COL, BAR_ROW);

    expect(squarePalette).not.toBe(bgPalette);
  });

  test("clicking Start activates animation and frame counter advances", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("paused", 3000)).toBe(true);

    const idlePalette = cellPalette(session, BAR_COL, BAR_ROW);

    const startBtn = session.findText("Start");
    expect(startBtn).not.toBeNull();

    session.click(startBtn!.col + 2, startBtn!.row, MouseButton.Left);

    expect(await session.waitForText("running", 3000)).toBe(true);

    const activePalette = cellPalette(session, BAR_COL, BAR_ROW);
    expect(activePalette).not.toBe(idlePalette);

    await session.wait(600);

    const screenLater = session.getScreen().raw;
    const laterMatch = screenLater.match(/f:(\d+)/);
    expect(laterMatch).not.toBeNull();
    expect(Number(laterMatch![1])).toBeGreaterThan(0);
  });

  test("clicking Stop freezes animation", async () => {
    await session.spawn("bun", [fixture]);

    expect(await session.waitForText("paused", 3000)).toBe(true);

    const startBtn = session.findText("Start");
    expect(startBtn).not.toBeNull();

    session.click(startBtn!.col + 2, startBtn!.row, MouseButton.Left);

    expect(await session.waitForText("running", 3000)).toBe(true);

    await session.wait(500);

    const stopBtn = session.findText("Stop");
    expect(stopBtn).not.toBeNull();

    session.click(stopBtn!.col + 2, stopBtn!.row, MouseButton.Left);

    expect(await session.waitForText("stopped", 3000)).toBe(true);

    const frozenPalette = cellPalette(session, BAR_COL, BAR_ROW);
    await session.wait(500);
    const stillFrozenPalette = cellPalette(session, BAR_COL, BAR_ROW);

    expect(frozenPalette).toBe(stillFrozenPalette);

    const frozenFrame = session.getScreen().raw.match(/f:(\d+)/);
    expect(frozenFrame).not.toBeNull();
    await session.wait(500);
    const laterFrame = session.getScreen().raw.match(/f:(\d+)/);
    expect(laterFrame).not.toBeNull();
    expect(Number(laterFrame![1])).toBe(Number(frozenFrame![1]));
  });
});
