import { skipAnsiSequence } from "./ansi-scanner.ts";

const COMBINING_MARK_RE = /\p{Mark}/u;
const EXTENDED_PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u;

export type AnsiPolicy = "literal" | "skip-csi-osc";
export type WhiteSpaceMode = "normal" | "pre-wrap";

export interface PrepareTextOptions {
  ansi?: AnsiPolicy;
  whiteSpace?: WhiteSpaceMode;
  tabs?: number;
}

export interface TextCursor {
  segmentIndex: number;
  clusterIndex: number;
}

export interface TextRowRange {
  width: number;
  start: TextCursor;
  end: TextCursor;
}

export interface MaterializedTextRow {
  text: string;
  width: number;
}

export interface TextLayout {
  rowCount: number;
  maxRowWidth: number;
}

type PreparedTextBrand = { readonly __preparedText: unique symbol };

interface PreparedCluster {
  text: string;
  width: number;
}

interface PreparedSegment {
  text: string;
  clusters: readonly PreparedCluster[];
}

interface PreparedTextData {
  readonly source: string;
  readonly visibleText: string;
  readonly options: Required<PrepareTextOptions>;
  readonly segments: readonly PreparedSegment[];
  readonly trailingHardBreak: boolean;
}

export type PreparedText = PreparedTextBrand & PreparedTextData;

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function prepareText(source: string, options: PrepareTextOptions = {}): PreparedText {
  const normalizedOptions: Required<PrepareTextOptions> = {
    ansi: options.ansi ?? "skip-csi-osc",
    whiteSpace: options.whiteSpace ?? "normal",
    tabs: options.tabs ?? 8,
  };

  const visibleText = normalizeVisibleText(source, normalizedOptions);
  const trailingHardBreak = visibleText.endsWith("\n");
  const rawSegments = visibleText.length > 0 ? visibleText.split("\n") : [];
  if (trailingHardBreak && rawSegments.length > 0) {
    rawSegments.pop();
  }

  const segments: PreparedSegment[] = rawSegments.map((segmentText) => ({
    text: segmentText,
    clusters: Array.from(graphemeSegmenter.segment(segmentText), (part) => ({
      text: part.segment,
      width: measureCellWidth(part.segment),
    })),
  }));

  return {
    source,
    visibleText,
    options: normalizedOptions,
    segments,
    trailingHardBreak,
  } as unknown as PreparedText;
}

export function layoutText(prepared: PreparedText, options: { columns: number }): TextLayout {
  const { rows } = computeRows(prepared, options.columns, undefined);
  let maxRowWidth = 0;
  for (const row of rows) {
    if (row.width > maxRowWidth) {
      maxRowWidth = row.width;
    }
  }
  return { rowCount: rows.length, maxRowWidth };
}

export function walkTextRows(
  prepared: PreparedText,
  options: { columns: number; start?: TextCursor },
  visit: (row: TextRowRange) => void,
): number {
  const { rows } = computeRows(prepared, options.columns, options.start);
  for (const row of rows) {
    visit(row);
  }
  return rows.length;
}

export function nextTextRow(
  prepared: PreparedText,
  start: TextCursor,
  options: { columns: number },
): TextRowRange | null {
  const { rows } = computeRows(prepared, options.columns, start);
  return rows[0] ?? null;
}

export function materializeTextRow(prepared: PreparedText, row: TextRowRange): MaterializedTextRow {
  const start = normalizeCursor(row.start, prepared);
  if (!start) {
    return { text: "", width: row.width };
  }

  const startSegment = prepared.segments[start.segmentIndex];
  if (!startSegment) {
    return { text: "", width: row.width };
  }

  let endClusterIndex = row.end.clusterIndex;
  if (row.end.segmentIndex !== start.segmentIndex) {
    endClusterIndex = startSegment.clusters.length;
  }

  let text = "";
  for (let i = start.clusterIndex; i < endClusterIndex; i++) {
    text += startSegment.clusters[i]!.text;
  }
  return { text, width: row.width };
}

function normalizeVisibleText(source: string, options: Required<PrepareTextOptions>): string {
  let text = options.ansi === "skip-csi-osc" ? stripRecognizedAnsi(source) : source;
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (options.whiteSpace === "pre-wrap") {
    return text.replace(/\t/g, " ".repeat(Math.max(1, options.tabs)));
  }

  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n");
}

function stripRecognizedAnsi(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const skip = skipAnsiSequence(text, i);
    if (skip > 0) {
      i += skip;
      continue;
    }
    out += text[i]!;
    i++;
  }
  return out;
}

function computeRows(
  prepared: PreparedText,
  columns: number,
  start: TextCursor | undefined,
): { rows: TextRowRange[]; nextCursor: TextCursor } {
  if (!Number.isFinite(columns) || columns < 0) {
    throw new RangeError(`columns must be a finite, non-negative number; received ${columns}`);
  }

  const rows: TextRowRange[] = [];
  if (columns === 0 || prepared.segments.length === 0) {
    return { rows, nextCursor: terminalCursor(prepared) };
  }

  const normalizedStart = normalizeCursor(start, prepared) ?? terminalCursor(prepared);
  let segmentIndex = normalizedStart.segmentIndex;
  let clusterIndex = normalizedStart.clusterIndex;

  while (segmentIndex < prepared.segments.length) {
    const segment = prepared.segments[segmentIndex]!;

    if (segment.clusters.length === 0) {
      if (clusterIndex === 0) {
        rows.push({
          width: 0,
          start: { segmentIndex, clusterIndex: 0 },
          end: { segmentIndex: segmentIndex + 1, clusterIndex: 0 },
        });
      }
      segmentIndex += 1;
      clusterIndex = 0;
      continue;
    }

    let lineStartCluster = clusterIndex;
    while (lineStartCluster < segment.clusters.length) {
      let lineWidth = 0;
      let lineEndCluster = lineStartCluster;

      while (lineEndCluster < segment.clusters.length) {
        const cluster = segment.clusters[lineEndCluster]!;
        if (lineWidth > 0 && lineWidth + cluster.width > columns) {
          break;
        }
        lineWidth += cluster.width;
        lineEndCluster += 1;
        if (lineWidth >= columns) {
          break;
        }
      }

      rows.push({
        width: lineWidth,
        start: { segmentIndex, clusterIndex: lineStartCluster },
        end: endCursorForSegment(segmentIndex, lineEndCluster, segment.clusters.length),
      });

      if (lineEndCluster >= segment.clusters.length) {
        break;
      }
      lineStartCluster = lineEndCluster;
    }

    segmentIndex += 1;
    clusterIndex = 0;
  }

  return { rows, nextCursor: terminalCursor(prepared) };
}

function normalizeCursor(
  cursor: TextCursor | undefined,
  prepared: PreparedText,
): TextCursor | null {
  if (!cursor) {
    return prepared.segments.length === 0 ? null : { segmentIndex: 0, clusterIndex: 0 };
  }

  let segmentIndex = Math.max(0, Math.min(cursor.segmentIndex, prepared.segments.length));
  let clusterIndex = Math.max(0, cursor.clusterIndex);

  while (segmentIndex < prepared.segments.length) {
    const segment = prepared.segments[segmentIndex]!;
    if (clusterIndex < segment.clusters.length) {
      return { segmentIndex, clusterIndex };
    }
    if (segment.clusters.length === 0 && clusterIndex === 0) {
      return { segmentIndex, clusterIndex: 0 };
    }
    segmentIndex += 1;
    clusterIndex = 0;
  }

  return null;
}

function endCursorForSegment(
  segmentIndex: number,
  clusterIndex: number,
  segmentLength: number,
): TextCursor {
  if (clusterIndex >= segmentLength) {
    return { segmentIndex: segmentIndex + 1, clusterIndex: 0 };
  }
  return { segmentIndex, clusterIndex };
}

function terminalCursor(prepared: PreparedText): TextCursor {
  return { segmentIndex: prepared.segments.length, clusterIndex: 0 };
}

function measureCellWidth(text: string): number {
  let width = 0;
  for (const symbol of text) {
    width += codePointWidth(symbol);
  }
  return width;
}

function codePointWidth(symbol: string): number {
  const codePoint = symbol.codePointAt(0);
  if (codePoint === undefined) return 0;

  if (isControl(codePoint)) return 0;
  if (isZeroWidth(codePoint, symbol)) return 0;
  if (isWide(codePoint, symbol)) return 2;
  return 1;
}

function isControl(codePoint: number): boolean {
  return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint < 0xa0);
}

function isZeroWidth(codePoint: number, symbol: string): boolean {
  return (
    codePoint === 0x200b ||
    codePoint === 0x200d ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef) ||
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
    COMBINING_MARK_RE.test(symbol)
  );
}

function isWide(codePoint: number, symbol: string): boolean {
  return (
    EXTENDED_PICTOGRAPHIC_RE.test(symbol) ||
    (codePoint >= 0x1100 &&
      (codePoint <= 0x115f ||
        codePoint === 0x2329 ||
        codePoint === 0x232a ||
        (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
        (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
        (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
        (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
        (codePoint >= 0xff00 && codePoint <= 0xff60) ||
        (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
        (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
        (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
        (codePoint >= 0x20000 && codePoint <= 0x3fffd)))
  );
}
