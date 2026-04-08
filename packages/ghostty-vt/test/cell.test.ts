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

  it("preserves prior line content after cursor-addressed single-cell redraw", () => {
    term = createTerminal({ cols: 70, rows: 16 });
    term.write("\x1b[3;1H│ Count: 0                   │");
    term.write("\x1b[3;10H1");

    const screen = term.getScreen();
    expect(screen).toContain("Count: 1");

    const cell = term.getCell(9, 2);
    expect(cell.hasText).toBe(true);
    expect(cell.text).toBe("1");
  });

  it("ignores SGR mouse input bytes when formatting later redraws", () => {
    term = createTerminal({ cols: 70, rows: 16 });
    expect(term.isAltScreen()).toBe(false);
    term.write("\x1b[?1003h\x1b[?1006h");
    expect(term.isAltScreen()).toBe(false);
    term.write(
      "\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m\x1b[1;1H┌────────────────────────────┐" +
        "\x1b[0m\x1b[48;2;10;14;22m                                                  " +
        "\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m\x1b[2;1H│\x1b[0m\x1b[48;2;100;149;237m                            \x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m│" +
        "\x1b[0m\x1b[48;2;10;14;22m                                                  " +
        "\x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m\x1b[3;1H│\x1b[0m\x1b[48;2;100;149;237m \x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237mCount: 0\x1b[0m\x1b[48;2;100;149;237m                   \x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m│",
    );
    term.write(
      "\x1b[4;1H│\x1b[0m\x1b[48;2;100;149;237m                            \x1b[0m\x1b[38;2;255;255;255m\x1b[48;2;100;149;237m│\x1b[5;1H└────────────────────────────┘",
    );
    term.write(
      "\x1b[6;1H                                                                                \x1b[7;1H                                                                                \x1b[8;1H                                                                                \x1b[9;1H                                                                                \x1b[10;1H                                                                                \x1b[11;1H                                                                                \x1b[12;1H                                                                                \x1b[13;1H                                                                                \x1b[14;1H                                                                                \x1b[15;1H                                                                                \x1b[16;1H                                                                                \x1b[17;1H                                                                                \x1b[18;1H                                                                                \x1b[19;1H                                                                                \x1b[20;1H                                                                                \x1b[21;1H                                                                                \x1b[22;1H                                                                                \x1b[23;1H                                                                                \x1b[24;1H                                                                                ",
    );
    term.write("\x1b[<35;6;4M\x1b[<0;6;4M\x1b[<0;6;4m");
    term.write("\x1b[3;10H1");

    const cell = term.getCell(9, 2);
    expect(cell.hasText).toBe(true);
    expect(cell.text).toBe("1");

    const line = Array.from({ length: 30 }, (_, col) => term.getCell(col, 2).text || " ").join("");
    expect(line).toContain("Count: 1");
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
