import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, MouseAction, MouseButton, resolveExample, type TerminalSession } from "../../test-harness/src/index";

const basicButton = resolveExample("basic-button");
const modalMenu = resolveExample("modal-menu");
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

describe("modal-menu example", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 20, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("opens from keyboard shortcut and runs a command", async () => {
    await session.spawn("bun", [modalMenu]);
    expect(await session.waitForText("Palette closed", 2000)).toBe(true);
    expect(session.containsText("Command Palette")).toBe(false);

    session.sendKey("/");
    expect(await session.waitForText("Palette open", 2000)).toBe(true);
    expect(await session.waitForText("Command Palette", 2000)).toBe(true);
    expect(session.containsText("Explorer")).toBe(true);
    expect(session.containsText("Inspector")).toBe(true);
    expect(session.containsText("Open Project")).toBe(true);

    session.sendKey("down");
    session.sendKey("enter");

    expect(await session.waitForText("Ran Search Files", 2000)).toBe(true);
    expect(session.containsText("Command Palette")).toBe(false);
  });

  it("opens from button click and closes on outside click", async () => {
    await session.spawn("bun", [modalMenu]);
    expect(await session.waitForText("Open Menu", 2000)).toBe(true);

    const launcher = session.findText("Open Menu");
    expect(launcher).not.toBeNull();
    session.mouseMove(launcher!.col + 2, launcher!.row);
    await session.wait(120);
    session.mouseDown(launcher!.col + 2, launcher!.row);
    await session.wait(50);
    session.mouseUp(launcher!.col + 2, launcher!.row);

    expect(await session.waitForText("Command Palette", 2000)).toBe(true);
    expect(session.containsText("Run Test Suite")).toBe(true);

    session.mouseMove(1, 1);
    await session.wait(80);
    session.mouseDown(1, 1);
    await session.wait(50);
    session.mouseUp(1, 1);

    expect(await session.waitForText("Palette closed", 2000)).toBe(true);
    expect(session.containsText("Command Palette")).toBe(false);
  });

  it("filters commands and closes with escape", async () => {
    await session.spawn("bun", [modalMenu]);
    expect(await session.waitForText("Palette closed", 2000)).toBe(true);

    session.write("\x0b");
    expect(await session.waitForText("Command Palette", 2000)).toBe(true);

    session.sendKey("r");
    session.sendKey("u");
    session.sendKey("n");
    expect(await session.waitForText("1 results", 2000)).toBe(true);
    expect(session.containsText("Run Test Suite")).toBe(true);
    expect(session.containsText("Open Project")).toBe(false);

    session.sendKey("escape");
    expect(await session.waitForText("Palette closed", 2000)).toBe(true);
    expect(session.containsText("Command Palette")).toBe(false);
  });
});
