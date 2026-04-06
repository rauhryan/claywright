import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { ActiveScreen, createTerminal, GhosttyTerminal, MouseTracking } from "../src/index";

describe("GhosttyTerminal cell inspection", () => {
  let term: GhosttyTerminal;

  beforeEach(() => {
    term = createTerminal({ cols: 10, rows: 5 });
  });

  afterEach(() => {
    term.free();
  });

  it("gets empty cell", () => {
    const cell = term.getCell(0, 0);
    expect(cell.hasText).toBe(false);
    expect(cell.text).toBe("");
    expect(cell.codepoint).toBe(0);
  });

  it("gets cell with text", () => {
    term.write("Hello");

    const cell = term.getCell(0, 0);
    expect(cell.hasText).toBe(true);
    expect(cell.text).toBe("H");
    expect(cell.codepoint).toBe(0x48);
  });

  it("gets cells at different positions", () => {
    term.write("ABC");

    const cell0 = term.getCell(0, 0);
    const cell1 = term.getCell(1, 0);
    const cell2 = term.getCell(2, 0);

    expect(cell0.text).toBe("A");
    expect(cell1.text).toBe("B");
    expect(cell2.text).toBe("C");
  });

  it("gets cells on different rows", () => {
    term.write("Line1\r\nLine2");

    const row0 = term.getCell(0, 0);
    const row1 = term.getCell(0, 1);

    expect(row0.text).toBe("L");
    expect(row1.text).toBe("L");
  });

  it("handles cursor positioning", () => {
    term.write("\x1b[3;5H");
    term.write("X");

    const cell = term.getCell(4, 2);
    expect(cell.hasText).toBe(true);
    expect(cell.text).toBe("X");
  });

  it("handles wide characters", () => {
    term.write("日");

    const cell0 = term.getCell(0, 0);
    expect(cell0.hasText).toBe(true);
    expect(cell0.wide).toBe(1);
  });
});

describe("GhosttyTerminal style inspection", () => {
  let term: GhosttyTerminal;

  beforeEach(() => {
    term = createTerminal({ cols: 10, rows: 5 });
  });

  afterEach(() => {
    term.free();
  });

  it("gets default style for empty cell", () => {
    const style = term.getCellStyle(0, 0);
    expect(style.bold).toBe(false);
    expect(style.italic).toBe(false);
    expect(style.inverse).toBe(false);
  });

  it("detects bold style", () => {
    term.write("\x1b[1mBold\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.bold).toBe(true);
  });

  it("detects italic style", () => {
    term.write("\x1b[3mItalic\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.italic).toBe(true);
  });

  it("detects inverse style", () => {
    term.write("\x1b[7mInverse\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.inverse).toBe(true);
  });

  it("detects underline style", () => {
    term.write("\x1b[4mUnderline\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.underline).toBe(1);
  });

  it("detects foreground color", () => {
    term.write("\x1b[31mRed\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.fg.tag).toBe(1);
    expect(style.fg.palette).toBe(1);
  });

  it("detects background color", () => {
    term.write("\x1b[41mRed BG\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.bg.tag).toBe(1);
    expect(style.bg.palette).toBe(1);
  });

  it("detects strikethrough", () => {
    term.write("\x1b[9mStrike\x1b[0m");

    const style = term.getCellStyle(0, 0);
    expect(style.strikethrough).toBe(true);
  });
});

describe("GhosttyTerminal mode inspection", () => {
  let term: GhosttyTerminal;

  beforeEach(() => {
    term = createTerminal({ cols: 10, rows: 5 });
  });

  afterEach(() => {
    term.free();
  });

  it("starts on primary screen", () => {
    expect(term.getActiveScreen()).toBe(ActiveScreen.Primary);
    expect(term.isAltScreen()).toBe(false);
  });

  it("detects alternate screen", () => {
    term.write("\x1b[?1049h");
    expect(term.isAltScreen()).toBe(true);
    expect(term.getActiveScreen()).toBe(ActiveScreen.Alternate);
  });

  it("detects mouse tracking mode", () => {
    expect(term.getMouseTrackingMode()).toBe(MouseTracking.None);
    term.write("\x1b[?1003h");
    expect(term.getMouseTrackingMode()).toBe(MouseTracking.Any);
  });
});
