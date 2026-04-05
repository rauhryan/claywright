import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, MouseAction, MouseButton, resolveExample, type TerminalSession } from "../../test-harness/src/index";

const basicButton = resolveExample("basic-button");
const selection = resolveExample("selection");

describe("basic-button example", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 10, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("renders idle state", async () => {
    await session.spawn("bun", [basicButton]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);
    expect(await session.waitForText("Clayterm", 2000)).toBe(true);
  });

  it("hovers, leaves, and clicks button", async () => {
    await session.spawn("bun", [basicButton]);
    expect(await session.waitForText("Idle", 2000)).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseMove(20, 6);
    await session.wait(150);
    expect(session.containsText("Hovered")).toBe(false);
    expect(session.containsText("Idle")).toBe(true);

    session.mouseMove(2, 1);
    expect(await session.waitForText("Hovered", 2000)).toBe(true);

    session.mouseDown(2, 1);
    await session.wait(50);
    session.mouseUp(2, 1);
    expect(await session.waitForText("clicked", 2000)).toBe(true);
  });
});

describe("selection example", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 40, rows: 8, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("shows no selection initially", async () => {
    await session.spawn("bun", [selection]);
    expect(await session.waitForText("Selected: none", 2000)).toBe(true);
    expect(await session.waitForText("Selection", 2000)).toBe(true);
  });

  it("selects text across a drag range", async () => {
    await session.spawn("bun", [selection]);
    expect(await session.waitForText("Selected: none", 2000)).toBe(true);

    session.mouseDown(0, 0);
    await session.wait(50);
    session.sendMouse({ action: MouseAction.Motion, button: MouseButton.Left, col: 4, row: 0 });
    await session.wait(50);
    session.mouseUp(4, 0);

    expect(await session.waitForText("Selected: Hello", 2000)).toBe(true);
    expect(session.containsText("Selected: Hello")).toBe(true);
  });
});
