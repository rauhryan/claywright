import { describe, expect, it } from "bun:test";
import { createTerminal } from "../src/index.ts";

describe("GhosttyTerminal", () => {
  it("creates a terminal", () => {
    const term = createTerminal({ cols: 80, rows: 24 });
    expect(term).toBeDefined();
    term.free();
  });

  it("writes and reads text", () => {
    const term = createTerminal({ cols: 80, rows: 24 });
    term.write("Hello World");
    const screen = term.getScreen();
    expect(screen).toContain("Hello World");
    term.free();
  });

  it("handles cursor movement", () => {
    const term = createTerminal({ cols: 80, rows: 24 });
    term.write("\x1b[5;10H");
    term.write("X");
    const screen = term.getScreen();
    expect(screen).toContain("X");
    term.free();
  });

  it("handles colors", () => {
    const term = createTerminal({ cols: 80, rows: 24 });
    term.write("\x1b[31mRed\x1b[0m");
    const screen = term.getScreen();
    expect(screen).toContain("Red");
    term.free();
  });

  it("handles resize", () => {
    const term = createTerminal({ cols: 80, rows: 24 });
    term.write("Before resize");
    term.resize(40, 12);
    term.write("After resize");
    const screen = term.getScreen();
    expect(screen).toContain("After resize");
    term.free();
  });
});
