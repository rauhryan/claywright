import { RingBuffer } from "./ring-buffer.ts";
import { computeDisplayWidth, computeWrapPoints } from "./wrap-walker.ts";
import type {
  ResolvedTextViewport,
  TextStreamVirtualizerOptions,
  TextViewportEntry,
} from "./types.ts";

export class TextStreamVirtualizer {
  private _ringBuffer: RingBuffer;
  private _wrapCache: Map<number, number[]>;
  private _measureWidth: (text: string) => number;
  private _columns: number;
  private _rows: number;
  private _anchorLineIndex: number;
  private _anchorSubRow: number;
  private _isAtBottom: boolean;
  private _totalEstimatedVisualRows: number;
  private _currentEstimatedVisualRow: number;

  constructor(options: TextStreamVirtualizerOptions) {
    let maxLines = options.maxLines ?? 10_000;
    this._ringBuffer = new RingBuffer(maxLines);
    this._wrapCache = new Map();
    this._measureWidth = options.measureWidth;
    this._columns = options.columns;
    this._rows = options.rows;
    this._anchorLineIndex = 0;
    this._anchorSubRow = 0;
    this._isAtBottom = true;
    this._totalEstimatedVisualRows = 0;
    this._currentEstimatedVisualRow = 0;
  }

  get lineCount(): number {
    return this._ringBuffer.lineCount;
  }

  get baseIndex(): number {
    return this._ringBuffer.baseIndex;
  }

  get columns(): number {
    return this._columns;
  }

  get rows(): number {
    return this._rows;
  }

  get totalEstimatedVisualRows(): number {
    return this._totalEstimatedVisualRows;
  }

  get currentEstimatedVisualRow(): number {
    return this._currentEstimatedVisualRow;
  }

  get isAtBottom(): boolean {
    return this._isAtBottom;
  }

  get anchorLineIndex(): number {
    return this._anchorLineIndex;
  }

  get anchorSubRow(): number {
    return this._anchorSubRow;
  }

  private _estimateVisualRows(displayWidth: number): number {
    return Math.max(1, Math.ceil(displayWidth / this._columns));
  }

  appendLine(text: string): number {
    let displayWidth = computeDisplayWidth(text, this._measureWidth);

    if (this._ringBuffer.lineCount === this._ringBuffer.capacity) {
      let evictedLineIndex = this._ringBuffer.baseIndex;
      let evictedEntry = this._ringBuffer.get(evictedLineIndex)!;
      let evictedEstimate = this._estimateVisualRows(evictedEntry.displayWidth);

      this._wrapCache.delete(evictedLineIndex);
      this._totalEstimatedVisualRows -= evictedEstimate;

      if (this._anchorLineIndex > evictedLineIndex) {
        this._currentEstimatedVisualRow -= evictedEstimate;
      } else if (this._anchorLineIndex === evictedLineIndex) {
        this._anchorLineIndex = evictedLineIndex + 1;
        this._anchorSubRow = 0;
        this._currentEstimatedVisualRow = 0;
      }
    }

    let result = this._ringBuffer.append(text, displayWidth);
    let newLineIndex = result.lineIndex;
    let newEstimate = this._estimateVisualRows(displayWidth);
    this._totalEstimatedVisualRows += newEstimate;

    if (this._isAtBottom) {
      this._anchorLineIndex = newLineIndex;
      this._anchorSubRow = 0;
      this._currentEstimatedVisualRow = this._totalEstimatedVisualRows - newEstimate;
    }

    return newLineIndex;
  }

  resize(columns: number, rows: number): void {
    if (columns !== this._columns) {
      this._wrapCache.clear();

      let newTotal = 0;
      let baseIndex = this._ringBuffer.baseIndex;
      for (let i = baseIndex; i < baseIndex + this._ringBuffer.lineCount; i++) {
        let entry = this._ringBuffer.get(i);
        if (!entry) break;
        newTotal += Math.max(1, Math.ceil(entry.displayWidth / columns));
      }
      this._totalEstimatedVisualRows = newTotal;
      this._columns = columns;

      if (this._ringBuffer.lineCount > 0) {
        let anchorEntry = this._ringBuffer.get(this._anchorLineIndex);
        if (anchorEntry) {
          let wrapPoints = this._getWrapPoints(this._anchorLineIndex, anchorEntry.text);
          let exactSubRows = wrapPoints.length + 1;
          if (this._anchorSubRow >= exactSubRows) {
            this._anchorSubRow = exactSubRows - 1;
          }
        }
      }

      this._recomputeCurrentEstimate();
    }

    this._rows = rows;
  }

  scrollBy(deltaVisualRows: number): void {
    if (this._ringBuffer.lineCount === 0) return;

    let remaining = deltaVisualRows;

    if (remaining > 0) {
      while (remaining > 0) {
        let entry = this._ringBuffer.get(this._anchorLineIndex);
        if (!entry) break;

        let wrapPoints = this._getWrapPoints(this._anchorLineIndex, entry.text);
        let totalSubRows = wrapPoints.length + 1;
        let availableInLine = totalSubRows - this._anchorSubRow - 1;

        if (remaining <= availableInLine) {
          this._anchorSubRow += remaining;
          remaining = 0;
        } else {
          let nextEntry = this._ringBuffer.get(this._anchorLineIndex + 1);
          if (!nextEntry) {
            this._anchorSubRow = totalSubRows - 1;
            remaining = 0;
          } else {
            remaining -= availableInLine + 1;
            this._anchorLineIndex++;
            this._anchorSubRow = 0;
          }
        }
      }

      let lastLineIndex = this._ringBuffer.baseIndex + this._ringBuffer.lineCount - 1;
      if (this._anchorLineIndex === lastLineIndex) {
        let lastEntry = this._ringBuffer.get(lastLineIndex)!;
        let lastWrap = this._getWrapPoints(lastLineIndex, lastEntry.text);
        let lastTotalSubRows = lastWrap.length + 1;
        if (this._anchorSubRow === lastTotalSubRows - 1) {
          this._isAtBottom = true;
        }
      }
    } else if (remaining < 0) {
      if (this._isAtBottom) {
        this._isAtBottom = false;
      }

      remaining = -remaining;

      while (remaining > 0) {
        if (this._anchorSubRow >= remaining) {
          this._anchorSubRow -= remaining;
          remaining = 0;
        } else {
          remaining -= this._anchorSubRow;
          let prevEntry = this._ringBuffer.get(this._anchorLineIndex - 1);
          if (!prevEntry) {
            this._anchorSubRow = 0;
            remaining = 0;
          } else {
            this._anchorLineIndex--;
            let prevWrap = this._getWrapPoints(this._anchorLineIndex, prevEntry.text);
            let prevTotalSubRows = prevWrap.length + 1;
            this._anchorSubRow = prevTotalSubRows - 1;
            remaining -= 1;
          }
        }
      }
    }

    this._recomputeCurrentEstimate();
  }

  scrollToFraction(fraction: number): void {
    if (this._ringBuffer.lineCount === 0) return;

    let target = Math.min(
      Math.floor(fraction * this._totalEstimatedVisualRows),
      Math.max(this._totalEstimatedVisualRows - 1, 0),
    );

    let accumulated = 0;
    let baseIndex = this._ringBuffer.baseIndex;
    let lastLineIndex = baseIndex + this._ringBuffer.lineCount - 1;

    for (let i = baseIndex; i <= lastLineIndex; i++) {
      let entry = this._ringBuffer.get(i)!;
      let estimate = this._estimateVisualRows(entry.displayWidth);

      if (accumulated + estimate > target) {
        this._anchorLineIndex = i;
        this._anchorSubRow = Math.min(target - accumulated, estimate - 1);
        break;
      }

      accumulated += estimate;

      if (i === lastLineIndex) {
        this._anchorLineIndex = i;
        this._anchorSubRow = estimate - 1;
      }
    }

    let lastEntry = this._ringBuffer.get(lastLineIndex)!;
    let lastEstimate = this._estimateVisualRows(lastEntry.displayWidth);
    this._isAtBottom =
      this._anchorLineIndex === lastLineIndex && this._anchorSubRow === lastEstimate - 1;

    this._recomputeCurrentEstimate();
  }

  private _recomputeCurrentEstimate(): void {
    let estimate = 0;
    let baseIndex = this._ringBuffer.baseIndex;
    for (let i = baseIndex; i < this._anchorLineIndex; i++) {
      let entry = this._ringBuffer.get(i);
      if (!entry) break;
      estimate += this._estimateVisualRows(entry.displayWidth);
    }
    estimate += this._anchorSubRow;
    this._currentEstimatedVisualRow = Math.min(
      estimate,
      Math.max(this._totalEstimatedVisualRows - 1, 0),
    );
  }

  getLineDisplayWidth(lineIndex: number): number | undefined {
    return this._ringBuffer.get(lineIndex)?.displayWidth;
  }

  private _getWrapPoints(lineIndex: number, text: string): number[] {
    let cached = this._wrapCache.get(lineIndex);
    if (cached !== undefined) return cached;
    let wp = computeWrapPoints(text, this._columns, this._measureWidth);
    this._wrapCache.set(lineIndex, wp);
    return wp;
  }

  resolveViewport(): ResolvedTextViewport {
    if (this._ringBuffer.lineCount === 0) {
      return {
        entries: [],
        totalEstimatedVisualRows: 0,
        currentEstimatedVisualRow: 0,
        isAtBottom: true,
      };
    }

    let forwardEntries: TextViewportEntry[] = [];
    let rowsBudget = this._rows;
    let currentLineIndex = this._anchorLineIndex;
    let startSubRow = this._anchorSubRow;

    while (rowsBudget > 0) {
      let entry = this._ringBuffer.get(currentLineIndex);
      if (!entry) break;

      let wrapPoints = this._getWrapPoints(currentLineIndex, entry.text);
      let totalSubRows = wrapPoints.length + 1;
      let firstSubRow = startSubRow;
      let availableSubRows = totalSubRows - firstSubRow;
      let visibleSubRows = Math.min(availableSubRows, rowsBudget);

      forwardEntries.push({
        lineIndex: currentLineIndex,
        text: entry.text,
        wrapPoints,
        totalSubRows,
        firstSubRow,
        visibleSubRows,
      });

      rowsBudget -= visibleSubRows;
      currentLineIndex++;
      startSubRow = 0;
    }

    let backEntries: TextViewportEntry[] = [];
    if (rowsBudget > 0) {
      if (this._anchorSubRow > 0 && forwardEntries.length > 0) {
        let anchor = forwardEntries[0]!;
        let fillAbove = Math.min(this._anchorSubRow, rowsBudget);
        forwardEntries[0] = {
          ...anchor,
          firstSubRow: anchor.firstSubRow - fillAbove,
          visibleSubRows: anchor.visibleSubRows + fillAbove,
        };
        rowsBudget -= fillAbove;
      }

      let backLineIndex = this._anchorLineIndex - 1;
      while (rowsBudget > 0 && backLineIndex >= this._ringBuffer.baseIndex) {
        let entry = this._ringBuffer.get(backLineIndex);
        if (!entry) break;

        let wrapPoints = this._getWrapPoints(backLineIndex, entry.text);
        let totalSubRows = wrapPoints.length + 1;
        let visibleSubRows = Math.min(totalSubRows, rowsBudget);
        let firstSubRow = totalSubRows - visibleSubRows;

        backEntries.push({
          lineIndex: backLineIndex,
          text: entry.text,
          wrapPoints,
          totalSubRows,
          firstSubRow,
          visibleSubRows,
        });

        rowsBudget -= visibleSubRows;
        backLineIndex--;
      }
    }

    let entries: TextViewportEntry[] = [];
    for (let index = backEntries.length - 1; index >= 0; index--) {
      entries.push(backEntries[index]!);
    }
    entries.push(...forwardEntries);

    return {
      entries,
      totalEstimatedVisualRows: this._totalEstimatedVisualRows,
      currentEstimatedVisualRow: this._currentEstimatedVisualRow,
      isAtBottom: this._isAtBottom,
    };
  }
}

export { TextStreamVirtualizer as Virtualizer };
