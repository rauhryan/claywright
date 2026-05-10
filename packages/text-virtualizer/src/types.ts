export interface TextStreamVirtualizerOptions {
  measureWidth: (text: string) => number;
  maxLines?: number;
  /**
   * Viewport width in columns. Must be ≥ the maximum width that
   * `measureWidth` returns for any single visible glyph.
   */
  columns: number;
  rows: number;
}

export interface TextViewportEntry {
  lineIndex: number;
  text: string;
  wrapPoints: number[];
  totalSubRows: number;
  firstSubRow: number;
  visibleSubRows: number;
}

export interface ResolvedTextViewport {
  entries: TextViewportEntry[];
  totalEstimatedVisualRows: number;
  currentEstimatedVisualRow: number;
  isAtBottom: boolean;
}
