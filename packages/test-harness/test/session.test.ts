import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import {
  type CapturedFrame,
  createSession,
  TerminalSession,
  MouseAction,
  MouseButton,
  MouseTracking,
} from "../src/index";

describe("TerminalSession", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24 });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("creates a terminal session", () => {
    expect(session).toBeDefined();
    const screen = session.getScreen();
    expect(screen.cols).toBe(80);
    expect(screen.rows).toBe(24);
  });

  it("captures direct VT output", () => {
    const term = session.getTerminal();
    term.write("Hello World");

    expect(session.containsText("Hello World")).toBe(true);
    expect(session.getLine(0)).toContain("Hello World");
  });

  it("handles cursor positioning", () => {
    const term = session.getTerminal();
    term.write("\x1b[5;10H");
    term.write("X");

    const line = session.getLine(4);
    expect(line.substring(9, 10)).toBe("X");
  });

  it("handles colors and styles", () => {
    const term = session.getTerminal();
    term.write("\x1b[31mRed Text\x1b[0m Normal");

    expect(session.containsText("Red Text")).toBe(true);
    expect(session.containsText("Normal")).toBe(true);
  });

  it("handles line clearing", () => {
    const term = session.getTerminal();
    term.write("Line 1\r\nLine 2\r\n");
    term.write("\x1b[2;1H");
    term.write("\x1b[2K");
    term.write("New Line 2");

    expect(session.containsText("Line 1")).toBe(true);
    expect(session.containsText("New Line 2")).toBe(true);
  });

  it("captures VT sequences", () => {
    session.startVTCapture();
    session.write("\x1b[31mRed\x1b[0m");
    const sequences = session.stopVTCapture();

    expect(sequences.length).toBeGreaterThan(0);
  });

  it("handles resize", () => {
    session.resize(120, 40);
    const screen = session.getScreen();
    expect(screen.cols).toBe(120);
    expect(screen.rows).toBe(40);
  });

  it("emits a synthetic resize sequence for child apps", () => {
    session.startVTCapture();
    session.resize(120, 40);

    expect(session.getVTSequences()).toContain("\\x1b[8;40;120t");
    session.stopVTCapture();
  });

  it("finds text position", () => {
    const term = session.getTerminal();
    term.write("Hello at start\r\n");
    term.write("World on line 2");

    const pos = session.findText("World");
    expect(pos).toEqual({ row: 1, col: 0 });
  });

  it("exposes cell inspection", () => {
    const term = session.getTerminal();
    term.write("ABC");

    const cell = session.getCell(1, 0);
    expect(cell.text).toBe("B");
  });

  it("matches inverse style", () => {
    const term = session.getTerminal();
    term.write("\x1b[7mX\x1b[0m");

    expect(session.matchesStyle(0, 0, { inverse: true })).toBe(true);
    expect(session.matchesStyle(0, 0, { bold: true })).toBe(false);
  });

  it("extracts text ranges", () => {
    const term = session.getTerminal();
    term.write("Hello\r\nWorld");

    expect(session.getTextRange(0, 0, 4, 0)).toBe("Hello");
    expect(session.getTextRange(0, 0, 4, 1)).toContain("World");
  });

  it("diffs changed cells", () => {
    const before = session.getScreen();
    const term = session.getTerminal();
    term.write("Hi");

    const changes = session.getChangedCells(before);
    expect(
      changes.some((change) => change.col === 0 && change.row === 0 && change.after === "H"),
    ).toBe(true);
    expect(
      changes.some((change) => change.col === 1 && change.row === 0 && change.after === "i"),
    ).toBe(true);
  });

  it("supports drag helper", () => {
    session.startVTCapture();
    session.drag(1, 1, 4, 1);
    const sequences = session.getVTSequences();

    expect(sequences.length).toBeGreaterThan(0);
  });

  it("reports terminal modes", () => {
    expect(session.isAltScreen()).toBe(false);
    expect(session.getMouseTrackingMode()).toBe(MouseTracking.None);

    const term = session.getTerminal();
    term.write("\x1b[?1049h\x1b[?1002h");

    expect(session.isAltScreen()).toBe(true);
    expect(session.getMouseTrackingMode()).toBe(MouseTracking.Button);
  });

  it("asserts selection on inverse cells", () => {
    const term = session.getTerminal();
    term.write("\x1b[7mHello\x1b[0m there");

    expect(() => session.assertSelection(0, 0, 4, 0)).not.toThrow();
    expect(() =>
      session.assertNoSelection([
        { col: 5, row: 0 },
        { col: 6, row: 0 },
      ]),
    ).not.toThrow();
  });

  it("returns selected text from a range", () => {
    const term = session.getTerminal();
    term.write("Hello world");

    expect(session.getSelectedText(0, 0, 4, 0)).toBe("Hello");
  });

  it("captures style diffs", () => {
    const before = session.captureStyles([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ]);

    const term = session.getTerminal();
    term.write("\x1b[7mABC\x1b[0m");

    const changes = session.getStyleChanges(before);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some((change) => change.after.inverse)).toBe(true);
  });

  it("sends mouse click", () => {
    session.startVTCapture();
    session.click(5, 3);
    const sequences = session.getVTSequences();

    expect(sequences.length).toBeGreaterThan(0);
    const seq = sequences.join("");
    expect(seq).toContain("M");
  });

  it("sends mouse move", () => {
    session.startVTCapture();
    session.sendMouse({
      action: MouseAction.Motion,
      button: MouseButton.Left,
      col: 10,
      row: 5,
    });
    const sequences = session.getVTSequences();

    expect(sequences.length).toBeGreaterThan(0);
  });

  it("sends custom mouse event", () => {
    session.startVTCapture();
    session.sendMouse({
      action: MouseAction.Press,
      button: MouseButton.Right,
      col: 20,
      row: 10,
    });
    const sequences = session.getVTSequences();

    expect(sequences.length).toBeGreaterThan(0);
  });
});

describe("TerminalSession with process", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 80, rows: 24 });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("spawns and captures echo command", async () => {
    await session.spawn("echo", ["Hello from echo"]);
    await session.wait(100);

    expect(session.containsText("Hello from echo")).toBe(true);
  });

  it("spawns and captures printf with formatting", async () => {
    await session.spawn("printf", ["\\033[31mRed\\033[0m\\n"]);
    await session.wait(100);

    expect(session.containsText("Red")).toBe(true);
  });

  it("captures process output frames", async () => {
    session.startFrameCapture();
    await session.spawn("sh", ["-c", "printf 'Hello'; sleep 0.05; printf ' World'"]);
    expect(await session.waitForText("Hello World", 2000)).toBe(true);
    const frames = session.stopFrameCapture();

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]?.screen.raw).toContain("Hello");
    expect(frames[frames.length - 1]?.screen.raw).toContain("Hello World");
    expect(frames[0]?.escaped).toContain("Hello");
  });

  it("streams process output frames with async iteration", async () => {
    await session.spawn("sh", ["-c", "printf 'one'; sleep 0.05; printf ' two'"]);

    const frames: CapturedFrame[] = [];
    for await (const frame of session.frames()) {
      frames.push(frame);
      if (frame.screen.raw.includes("one two")) {
        break;
      }
    }

    expect(frames.length).toBeGreaterThan(0);
    expect(frames.some((frame) => frame.screen.raw.includes("one"))).toBe(true);
    expect(frames.some((frame) => frame.screen.raw.includes("one two"))).toBe(true);
  });

  it("waits for a matching frame", async () => {
    await session.spawn("sh", ["-c", "printf 'one'; sleep 0.05; printf ' two'"]);

    const frame = await session.waitForFrameText("one two", { timeout: 2000 });

    expect(frame).not.toBeNull();
    expect(frame?.screen.raw).toContain("one two");
  });

  it("waits for converged text after multiple frames", async () => {
    await session.spawn("sh", ["-c", "printf 'start'; sleep 0.05; printf '\rfinal'"]);

    const screen = await session.waitForTextConvergence("final", { settleMs: 75, timeout: 2000 });

    expect(screen).not.toBeNull();
    expect(screen?.raw).toContain("final");
  });

  it("ends async frame iteration when the process exits", async () => {
    await session.spawn("printf", ["done"]);

    const seen: string[] = [];
    for await (const frame of session.frames()) {
      seen.push(frame.screen.raw);
    }

    expect(seen.some((raw) => raw.includes("done"))).toBe(true);
  });

  it("captures exit code", async () => {
    await session.spawn("sh", ["-c", "exit 42"]);
    const exitCode = await session.waitForExit();

    expect(exitCode).toBe(42);
  });
});
