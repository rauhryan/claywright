import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, MouseAction, MouseButton, type TerminalSession } from "../src/index";

const fixture = new URL("./fixtures/clayterm-basic.ts", import.meta.url).pathname;
const selectionFixture = new URL("./fixtures/clayterm-selection.ts", import.meta.url).pathname;

describe("clayterm blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 10, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("renders initial clayterm frame", async () => {
    await session.spawn("bun", [fixture]);
    let ready = await session.waitForText("Idle", 2000);

    expect(ready).toBe(true);
    expect(session.containsText("Idle")).toBe(true);
    expect(session.isAltScreen()).toBe(false);
  });

  it("updates on hover and click", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseDown(2, 1);
    await session.wait(50);
    session.mouseUp(2, 1);
    expect(await session.waitForText("Clicked", 2000)).toBe(true);
  });

  it("clears hover when pointer leaves", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseMove(20, 6);
    await session.wait(150);
    expect(session.containsText("Hovered")).toBe(false);
    expect(session.containsText("Idle")).toBe(true);
  });

  it("does not click when release happens outside target", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseDown(2, 1);
    await session.wait(50);
    session.mouseMove(20, 6);
    await session.wait(50);
    session.mouseUp(20, 6);
    await session.wait(150);

    expect(session.containsText("Clicked")).toBe(false);
  });
});

describe("clayterm selection blackbox", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 8, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("selects text across a drag range", async () => {
    await session.spawn("bun", [selectionFixture]);
    expect(await session.waitForText("Selected: none", 2000)).toBe(true);

    const before = session.captureStyles([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 4, row: 0 },
    ]);

    session.mouseDown(0, 0);
    await session.wait(50);
    session.sendMouse({ action: MouseAction.Motion, button: MouseButton.Left, col: 4, row: 0 });
    await session.wait(50);
    session.mouseUp(4, 0);

    expect(await session.waitForText("Selected: Hello", 2000)).toBe(true);
    const changes = session.getStyleChanges(before);
    expect(changes.length).toBeGreaterThan(0);
    expect(
      changes.some(
        (change) =>
          change.after.bg.palette !== change.before.bg.palette ||
          change.after.fg.palette !== change.before.fg.palette,
      ),
    ).toBe(true);
  });
});
