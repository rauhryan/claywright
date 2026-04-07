import { spawn, Subprocess } from "bun";
import {
  createTerminal,
  GhosttyTerminal,
  type TerminalCell,
  type TerminalCellStyle,
  MouseEncoder,
  MouseEvent,
  MouseAction,
  MouseButton,
  MouseFormat,
  MouseTracking,
  Modifiers,
} from "@tui/ghostty-vt";

export interface TerminalSessionOptions {
  cols?: number;
  rows?: number;
  env?: Record<string, string>;
  cwd?: string;
}

export interface ScreenSnapshot {
  cols: number;
  rows: number;
  lines: string[];
  cursorX: number;
  cursorY: number;
  raw: string;
}

export interface CellMatch {
  inverse?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: number;
  fgPalette?: number;
  bgPalette?: number;
}

export interface StyleChange {
  col: number;
  row: number;
  before: TerminalCellStyle;
  after: TerminalCellStyle;
}

export interface CapturedFrame {
  index: number;
  at: number;
  chunk: Uint8Array;
  escaped: string;
  screen: ScreenSnapshot;
}

export interface ConvergenceOptions {
  timeout?: number;
  settleMs?: number;
}

interface PendingFrameRequest {
  resolve: (frame: CapturedFrame | null) => void;
}

interface FrameCaptureState {
  frames: CapturedFrame[];
  queue: CapturedFrame[];
  waiting: PendingFrameRequest[];
  closed: boolean;
}

export class TerminalSession {
  private terminal: GhosttyTerminal;
  private process: Subprocess<"pipe", "pipe", "pipe"> | null = null;
  private cols: number;
  private rows: number;
  private env: Record<string, string>;
  private cwd: string | undefined;
  private vtSequenceLog: Uint8Array[] = [];
  private capturingSequences: boolean = false;
  private frameCapture: FrameCaptureState | null = null;
  private mouseEncoder: MouseEncoder;
  private mouseEvent: MouseEvent;

  constructor(options: TerminalSessionOptions = {}) {
    this.cols = options.cols ?? 80;
    this.rows = options.rows ?? 24;
    this.env = options.env ?? {};
    this.cwd = options.cwd;
    this.terminal = createTerminal({
      cols: this.cols,
      rows: this.rows,
      maxScrollback: 10000,
    });
    this.mouseEncoder = new MouseEncoder({
      format: MouseFormat.SGR,
      tracking: MouseTracking.Any,
    });
    this.mouseEvent = new MouseEvent();
  }

  async spawn(command: string, args: string[] = []): Promise<void> {
    if (this.process) {
      throw new Error("Process already running");
    }

    this.process = spawn({
      cmd: [command, ...args],
      stdout: "pipe",
      stdin: "pipe",
      stderr: "pipe",
      cwd: this.cwd,
      env: {
        ...process.env,
        ...this.env,
        TERM: "xterm-256color",
        COLUMNS: String(this.cols),
        LINES: String(this.rows),
      },
    });

    const reader = this.process.stdout.getReader();

    const readOutput = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (this.capturingSequences) {
          this.vtSequenceLog.push(value);
        }

        this.terminal.write(value);
        this.recordFrame(value);
      }

      this.closeFrameCapture();
    };

    readOutput().catch(() => {
      this.closeFrameCapture();
    });
  }

  write(data: string | Uint8Array): void {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

    if (this.capturingSequences) {
      this.vtSequenceLog.push(bytes);
    }

    this.terminal.write(bytes);

    if (this.process?.stdin) {
      this.process.stdin.write(bytes);
    }
  }

  sendInput(data: string | Uint8Array): void {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;

    if (this.capturingSequences) {
      this.vtSequenceLog.push(bytes);
    }

    if (this.process?.stdin) {
      this.process.stdin.write(bytes);
    }
  }

  sendKey(key: string): void {
    const keyMap: Record<string, string> = {
      enter: "\r",
      tab: "\t",
      escape: "\x1b",
      up: "\x1b[A",
      down: "\x1b[B",
      right: "\x1b[C",
      left: "\x1b[D",
      home: "\x1b[H",
      end: "\x1b[F",
      backspace: "\x7f",
      delete: "\x1b[3~",
      pageup: "\x1b[5~",
      pagedown: "\x1b[6~",
    };

    const sequence = keyMap[key.toLowerCase()] ?? key;
    this.sendInput(sequence);
  }

  sendMouse(options: {
    action: MouseAction;
    button: MouseButton;
    col: number;
    row: number;
    modifiers?: Modifiers;
  }): void {
    const cellWidth = 10;
    const cellHeight = 20;
    const x = options.col * cellWidth + cellWidth / 2;
    const y = options.row * cellHeight + cellHeight / 2;

    this.mouseEncoder.setSize(this.cols * cellWidth, this.rows * cellHeight, cellWidth, cellHeight);

    this.mouseEvent.setAction(options.action);
    this.mouseEvent.setButton(options.button);
    this.mouseEvent.setPosition(x, y);
    if (options.modifiers !== undefined) {
      this.mouseEvent.setModifiers(options.modifiers);
    }

    const sequence = this.mouseEncoder.encode(this.mouseEvent);
    if (sequence) {
      this.sendInput(sequence);
    }
  }

  click(col: number, row: number, button: MouseButton = MouseButton.Left): void {
    this.sendMouse({ action: MouseAction.Press, button, col, row });
    this.sendMouse({ action: MouseAction.Release, button, col, row });
  }

  mouseDown(col: number, row: number, button: MouseButton = MouseButton.Left): void {
    this.sendMouse({ action: MouseAction.Press, button, col, row });
  }

  mouseUp(col: number, row: number, button: MouseButton = MouseButton.Left): void {
    this.sendMouse({ action: MouseAction.Release, button, col, row });
  }

  doubleClick(col: number, row: number): void {
    this.click(col, row);
    this.click(col, row);
  }

  mouseMove(col: number, row: number): void {
    this.sendMouse({
      action: MouseAction.Motion,
      button: MouseButton.Unknown,
      col,
      row,
    });
  }

  getScreen(): ScreenSnapshot {
    const raw = this.terminal.getScreen();
    const lines = raw.split("\n");

    return {
      cols: this.cols,
      rows: this.rows,
      lines,
      cursorX: 0,
      cursorY: 0,
      raw,
    };
  }

  getLine(row: number): string {
    const screen = this.getScreen();
    return screen.lines[row] ?? "";
  }

  getCell(col: number, row: number): TerminalCell {
    return this.terminal.getCell(col, row);
  }

  getCellStyle(col: number, row: number): TerminalCellStyle {
    return this.terminal.getCellStyle(col, row);
  }

  isAltScreen(): boolean {
    return this.terminal.isAltScreen();
  }

  getMouseTrackingMode(): MouseTracking {
    return this.terminal.getMouseTrackingMode();
  }

  drag(
    startCol: number,
    startRow: number,
    endCol: number,
    endRow: number,
    button: MouseButton = MouseButton.Left,
  ): void {
    this.sendMouse({ action: MouseAction.Press, button, col: startCol, row: startRow });
    this.sendMouse({ action: MouseAction.Motion, button, col: endCol, row: endRow });
    this.sendMouse({ action: MouseAction.Release, button, col: endCol, row: endRow });
  }

  matchesStyle(col: number, row: number, expected: CellMatch): boolean {
    const style = this.getCellStyle(col, row);

    if (expected.inverse !== undefined && style.inverse !== expected.inverse) return false;
    if (expected.bold !== undefined && style.bold !== expected.bold) return false;
    if (expected.italic !== undefined && style.italic !== expected.italic) return false;
    if (expected.underline !== undefined && style.underline !== expected.underline) return false;
    if (expected.fgPalette !== undefined && style.fg.palette !== expected.fgPalette) return false;
    if (expected.bgPalette !== undefined && style.bg.palette !== expected.bgPalette) return false;

    return true;
  }

  getTextRange(startCol: number, startRow: number, endCol: number, endRow: number): string {
    const parts: string[] = [];

    for (let row = startRow; row <= endRow; row++) {
      const colStart = row === startRow ? startCol : 0;
      const colEnd = row === endRow ? endCol : this.cols - 1;
      let line = "";

      for (let col = colStart; col <= colEnd; col++) {
        const cell = this.getCell(col, row);
        line += cell.text || " ";
      }

      parts.push(line);
    }

    return parts.join("\n");
  }

  getChangedCells(
    previous: ScreenSnapshot,
  ): Array<{ col: number; row: number; before: string; after: string }> {
    const current = this.getScreen();
    const changes: Array<{ col: number; row: number; before: string; after: string }> = [];
    const maxRows = Math.max(previous.lines.length, current.lines.length);

    for (let row = 0; row < maxRows; row++) {
      const beforeLine = previous.lines[row] ?? "";
      const afterLine = current.lines[row] ?? "";
      const maxCols = Math.max(beforeLine.length, afterLine.length, this.cols);

      for (let col = 0; col < maxCols; col++) {
        const before = beforeLine[col] ?? " ";
        const after = afterLine[col] ?? " ";
        if (before !== after) {
          changes.push({ col, row, before, after });
        }
      }
    }

    return changes;
  }

  getStyleChanges(
    before: Array<{ col: number; row: number; style: TerminalCellStyle }>,
  ): StyleChange[] {
    const changes: StyleChange[] = [];

    for (const cell of before) {
      const after = this.getCellStyle(cell.col, cell.row);
      if (!this.styleEquals(cell.style, after)) {
        changes.push({ col: cell.col, row: cell.row, before: cell.style, after });
      }
    }

    return changes;
  }

  captureStyles(
    cells: Array<{ col: number; row: number }>,
  ): Array<{ col: number; row: number; style: TerminalCellStyle }> {
    return cells.map((cell) => ({
      ...cell,
      style: this.getCellStyle(cell.col, cell.row),
    }));
  }

  assertSelection(startCol: number, startRow: number, endCol: number, endRow: number): void {
    const [leftCol, rightCol] = startCol <= endCol ? [startCol, endCol] : [endCol, startCol];
    const [topRow, bottomRow] = startRow <= endRow ? [startRow, endRow] : [endRow, startRow];

    for (let row = topRow; row <= bottomRow; row++) {
      const rowStart = row === topRow ? leftCol : 0;
      const rowEnd = row === bottomRow ? rightCol : this.cols - 1;

      for (let col = rowStart; col <= rowEnd; col++) {
        if (!this.matchesStyle(col, row, { inverse: true })) {
          throw new Error(`Expected selection at (${col}, ${row})`);
        }
      }
    }
  }

  assertNoSelection(cells: Array<{ col: number; row: number }>): void {
    for (const cell of cells) {
      if (this.matchesStyle(cell.col, cell.row, { inverse: true })) {
        throw new Error(`Expected no selection at (${cell.col}, ${cell.row})`);
      }
    }
  }

  getSelectedText(startCol: number, startRow: number, endCol: number, endRow: number): string {
    return this.getTextRange(startCol, startRow, endCol, endRow).trimEnd();
  }

  private styleEquals(a: TerminalCellStyle, b: TerminalCellStyle): boolean {
    return (
      a.bold === b.bold &&
      a.italic === b.italic &&
      a.faint === b.faint &&
      a.blink === b.blink &&
      a.inverse === b.inverse &&
      a.invisible === b.invisible &&
      a.strikethrough === b.strikethrough &&
      a.overline === b.overline &&
      a.underline === b.underline &&
      a.fg.tag === b.fg.tag &&
      a.fg.palette === b.fg.palette &&
      a.bg.tag === b.bg.tag &&
      a.bg.palette === b.bg.palette
    );
  }

  findText(text: string): { row: number; col: number } | null {
    const screen = this.getScreen();
    for (let row = 0; row < screen.lines.length; row++) {
      const col = screen.lines[row].indexOf(text);
      if (col !== -1) {
        return { row, col };
      }
    }
    return null;
  }

  containsText(text: string): boolean {
    return this.findText(text) !== null;
  }

  startVTCapture(): void {
    this.vtSequenceLog = [];
    this.capturingSequences = true;
  }

  stopVTCapture(): Uint8Array[] {
    this.capturingSequences = false;
    return [...this.vtSequenceLog];
  }

  getVTSequences(): string[] {
    return this.vtSequenceLog.map((chunk) =>
      Array.from(chunk)
        .map((b) =>
          b < 32 || b > 126 ? `\\x${b.toString(16).padStart(2, "0")}` : String.fromCharCode(b),
        )
        .join(""),
    );
  }

  startFrameCapture(): void {
    this.frameCapture = {
      frames: [],
      queue: [],
      waiting: [],
      closed: false,
    };
  }

  stopFrameCapture(): CapturedFrame[] {
    if (!this.frameCapture) {
      return [];
    }

    const frames = [...this.frameCapture.frames];
    this.closeFrameCapture();
    return frames;
  }

  getFrames(): CapturedFrame[] {
    return this.frameCapture ? [...this.frameCapture.frames] : [];
  }

  async *frames(): AsyncGenerator<CapturedFrame, void, void> {
    if (!this.frameCapture) {
      this.startFrameCapture();
    }

    while (this.frameCapture) {
      const queued = this.frameCapture.queue.shift();
      if (queued) {
        yield queued;
        continue;
      }

      if (this.frameCapture.closed) {
        return;
      }

      const frame = await new Promise<CapturedFrame | null>((resolve) => {
        this.frameCapture?.waiting.push({ resolve });
      });
      if (!frame) {
        return;
      }
      yield frame;
    }
  }

  async waitForFrame(
    predicate: (frame: CapturedFrame) => boolean,
    options: ConvergenceOptions = {},
  ): Promise<CapturedFrame | null> {
    const timeout = options.timeout ?? 5000;
    const existing = this.getFrames().find(predicate);
    if (existing) {
      return existing;
    }

    const start = Date.now();
    const frames = this.frames();

    while (Date.now() - start < timeout) {
      const remaining = timeout - (Date.now() - start);
      const nextFrame = frames.next();
      const timeoutResult = await Promise.race([
        nextFrame,
        this.wait(remaining).then(() => ({ done: true as const, value: undefined })),
      ]);

      if (timeoutResult.done) {
        return null;
      }

      if (predicate(timeoutResult.value)) {
        return timeoutResult.value;
      }
    }

    return null;
  }

  async waitForFrameText(
    text: string,
    options: ConvergenceOptions = {},
  ): Promise<CapturedFrame | null> {
    return this.waitForFrame((frame) => frame.screen.raw.includes(text), options);
  }

  async waitForConvergence(
    predicate: (screen: ScreenSnapshot) => boolean,
    options: ConvergenceOptions = {},
  ): Promise<ScreenSnapshot | null> {
    const timeout = options.timeout ?? 5000;
    const settleMs = options.settleMs ?? 100;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const screen = this.getScreen();
      if (predicate(screen)) {
        const baselineCount = this.getFrames().length;
        await this.wait(Math.min(settleMs, timeout - (Date.now() - start)));
        const latest = this.getScreen();
        if (this.getFrames().length === baselineCount && predicate(latest)) {
          return latest;
        }
      }

      await this.wait(25);
    }

    return null;
  }

  async waitForTextConvergence(
    text: string,
    options: ConvergenceOptions = {},
  ): Promise<ScreenSnapshot | null> {
    return this.waitForConvergence((screen) => screen.raw.includes(text), options);
  }

  async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async waitForText(text: string, timeout: number = 5000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.containsText(text)) {
        return true;
      }
      await this.wait(50);
    }
    return false;
  }

  async waitForExit(timeout: number = 5000): Promise<number> {
    if (!this.process) {
      throw new Error("No process running");
    }

    const start = Date.now();
    while (Date.now() - start < timeout) {
      const exitCode = await this.process.exited;
      if (exitCode !== null) {
        return exitCode;
      }
      await this.wait(50);
    }
    throw new Error("Process did not exit within timeout");
  }

  kill(): void {
    this.process?.kill();
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.terminal.resize(cols, rows);
  }

  cleanup(): void {
    this.closeFrameCapture();
    this.kill();
    this.mouseEvent.free();
    this.mouseEncoder.free();
    this.terminal.free();
  }

  getTerminal(): GhosttyTerminal {
    return this.terminal;
  }

  private recordFrame(chunk: Uint8Array): void {
    if (!this.frameCapture || this.frameCapture.closed) {
      return;
    }

    const frame: CapturedFrame = {
      index: this.frameCapture.frames.length,
      at: Date.now(),
      chunk: new Uint8Array(chunk),
      escaped: this.escapeBytes(chunk),
      screen: this.getScreen(),
    };

    this.frameCapture.frames.push(frame);

    const waiting = this.frameCapture.waiting.shift();
    if (waiting) {
      waiting.resolve(frame);
      return;
    }

    this.frameCapture.queue.push(frame);
  }

  private closeFrameCapture(): void {
    if (!this.frameCapture || this.frameCapture.closed) {
      return;
    }

    this.frameCapture.closed = true;
    for (const waiting of this.frameCapture.waiting) {
      waiting.resolve(null);
    }
    this.frameCapture.waiting = [];
  }

  private escapeBytes(chunk: Uint8Array): string {
    return Array.from(chunk)
      .map((b) =>
        b < 32 || b > 126 ? `\\x${b.toString(16).padStart(2, "0")}` : String.fromCharCode(b),
      )
      .join("");
  }
}

export function createSession(options?: TerminalSessionOptions): TerminalSession {
  return new TerminalSession(options);
}

export function resolveExample(name: string): string {
  return new URL(`../../clayterm-examples/src/examples/${name}.ts`, import.meta.url).pathname;
}

export { createTerminal, GhosttyTerminal } from "@tui/ghostty-vt";
export {
  MouseEncoder,
  MouseEvent,
  MouseAction,
  MouseButton,
  MouseFormat,
  MouseTracking,
  Modifiers,
} from "@tui/ghostty-vt";
export { matchSnapshot, expectSnapshot } from "./snapshot";
