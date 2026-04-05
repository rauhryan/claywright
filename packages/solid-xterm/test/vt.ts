import { Terminal } from "@xterm/headless";

export class VirtualTerminal {
  private term: Terminal;
  private cols: number;
  private rows: number;
  private writePromise: Promise<void> = Promise.resolve();

  constructor(cols = 80, rows = 24) {
    this.cols = cols;
    this.rows = rows;
    this.term = new Terminal({ cols, rows, allowProposedApi: true });
  }

  write(data: string): void {
    this.writePromise = new Promise((resolve) => {
      this.term.write(data, resolve);
    });
  }

  async sync(): Promise<void> {
    await this.writePromise;
  }

  clear(): void {
    this.term.clear();
  }

  getScreen(): string {
    const buffer = this.term.buffer.active;
    const lines: string[] = [];
    for (let y = 0; y < this.rows; y++) {
      let line = "";
      for (let x = 0; x < this.cols; x++) {
        const cell = buffer.getLine(y)?.getCell(x);
        if (cell) {
          line += cell.getChars() || " ";
        } else {
          line += " ";
        }
      }
      lines.push(line.trimEnd());
    }
    return lines.join("\n").trimEnd();
  }

  getLine(y: number): string {
    const buffer = this.term.buffer.active;
    let line = "";
    for (let x = 0; x < this.cols; x++) {
      const cell = buffer.getLine(y)?.getCell(x);
      if (cell) {
        line += cell.getChars() || " ";
      } else {
        line += " ";
      }
    }
    return line.trimEnd();
  }

  getCell(x: number, y: number): string {
    const buffer = this.term.buffer.active;
    const cell = buffer.getLine(y)?.getCell(x);
    return cell?.getChars() || " ";
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.term.resize(cols, rows);
  }
}
