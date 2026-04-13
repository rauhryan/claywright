import {
  fit,
  fixed,
  grow,
  materializeTextRow,
  prepareText,
  walkTextRows,
  type PreparedText,
  type PrepareTextOptions,
  type TextMeasureApi,
  type TextRowRange,
} from "clayterm";
import type { VirtualItem, VirtualItemMeasurement } from "./types";
import type { JSX } from "../jsx-runtime";

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const ANSI_BASE_COLORS = [
  0xff000000, 0xffcd3131, 0xff0dbc79, 0xffe5e510, 0xff2472c8, 0xffbc3fbc, 0xff11a8cd, 0xffe5e5e5,
] as const;

const ANSI_BRIGHT_COLORS = [
  0xff666666, 0xfff14c4c, 0xff23d18b, 0xfff5f543, 0xff3b8eea, 0xffd670d6, 0xff29b8db, 0xffffffff,
] as const;

const TRANSCRIPT_COLORS = {
  assistant: { accent: 0xff9ecbff, body: 0xffedf3ff },
  user: { accent: 0xffa6e3a1, body: 0xfff2fff0 },
  system: { accent: 0xffffd479, body: 0xfffff4d6 },
  thinking: { accent: 0xffd8b4fe, body: 0xfff4e8ff },
  meta: 0xff8b949e,
  collapsed: 0xff7d8590,
} as const;

const defaultPrepareOptions: Required<PrepareTextOptions> = {
  ansi: "skip-csi-osc",
  whiteSpace: "normal",
  tabs: 8,
};

interface StyledCodePoint {
  text: string;
  color?: number;
}

interface StyledCluster {
  text: string;
  color?: number;
}

interface StyledSegment {
  clusters: StyledCluster[];
}

interface PreparedTextPresenter {
  measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement;
  render(): JSX.Element;
}

type RowValueResolver<T> = T | ((row: PreparedTextRenderedRow) => T | undefined);

export interface PreparedTextRowRun {
  text: string;
  color?: number;
}

export interface PreparedTextRenderedRow {
  index: number;
  lineIndex: number;
  text: string;
  width: number;
  continued: boolean;
  totalRows: number;
  range: TextRowRange;
  runs: PreparedTextRowRun[];
}

export interface PreparedTextVirtualItemOptions {
  key: string;
  text: string;
  version?: string | number;
  prepare?: PrepareTextOptions;
  prepared?: PreparedText;
  estimatedElementsPerRow?: number;
  estimatedMeasuredWords?: number;
  containerBg?: number;
  rowColor?: RowValueResolver<number>;
  rowBg?: RowValueResolver<number>;
  renderMode?: "plain" | "ansi";
  renderRow?: (row: PreparedTextRenderedRow) => JSX.Element;
}

export type TranscriptVirtualItemKind = "assistant" | "user" | "system" | "thinking";

export interface TranscriptVirtualItemOptions {
  key: string;
  speaker: string;
  text: string;
  version?: string | number;
  timestamp?: string;
  kind?: TranscriptVirtualItemKind;
  collapsed?: boolean;
  collapsedSummary?: string;
  badgeText?: string;
  badgeColor?: number;
  badgeBg?: number;
  prepare?: PrepareTextOptions;
  prepared?: PreparedText;
  collapsedPrepared?: PreparedText;
  renderMode?: "plain" | "ansi";
  estimatedElementsPerRow?: number;
  estimatedMeasuredWords?: number;
  containerBg?: number;
  headerBg?: number;
  speakerColor?: number;
  metaColor?: number;
  bodyColor?: number;
  bodyBg?: number;
}

export function createPreparedTextVirtualItem(
  options: PreparedTextVirtualItemOptions,
): VirtualItem {
  const presenter = createPreparedTextPresenter(options);
  return {
    key: options.key,
    version: options.version ?? 1,
    measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement {
      return presenter.measure(width, measure);
    },
    render() {
      return presenter.render();
    },
  } satisfies VirtualItem;
}

export function createTranscriptVirtualItem(options: TranscriptVirtualItemOptions): VirtualItem {
  const kind = options.kind ?? "assistant";
  const accentColor = options.speakerColor ?? TRANSCRIPT_COLORS[kind].accent;
  const metaColor = options.metaColor ?? TRANSCRIPT_COLORS.meta;
  const bodyColor = options.bodyColor ?? TRANSCRIPT_COLORS[kind].body;
  const bodyPresenter = createPreparedTextPresenter({
    key: `${options.key}:body`,
    text: options.collapsed
      ? (options.collapsedSummary ?? defaultCollapsedSummary(kind))
      : options.text,
    version: options.version ?? 1,
    prepare: options.prepare,
    prepared: options.collapsed ? options.collapsedPrepared : options.prepared,
    estimatedElementsPerRow: options.estimatedElementsPerRow,
    estimatedMeasuredWords: options.estimatedMeasuredWords,
    containerBg: options.containerBg,
    rowColor: options.collapsed ? TRANSCRIPT_COLORS.collapsed : bodyColor,
    rowBg: options.bodyBg,
    renderMode: options.collapsed ? "plain" : (options.renderMode ?? "plain"),
  });
  const estimatedMeasuredWords = Math.max(
    options.speaker.trim().split(/\s+/).filter(Boolean).length,
    1,
  );

  return {
    key: options.key,
    version: options.version ?? 1,
    measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement {
      const bodyMeasurement = bodyPresenter.measure(width, measure);
      return {
        height: bodyMeasurement.height + 1,
        estimatedElements: (bodyMeasurement.estimatedElements ?? 0) + 2,
        estimatedMeasuredWords:
          (bodyMeasurement.estimatedMeasuredWords ?? 0) + estimatedMeasuredWords,
      };
    },
    render() {
      return (
        <box width={grow()} direction="ttb" bg={options.containerBg}>
          <box width={grow()} height={fixed(1)} bg={options.headerBg} direction="ltr" gap={1}>
            <text color={accentColor}>{options.speaker}</text>
            {options.badgeText ? (
              <box
                width={fit()}
                height={fixed(1)}
                bg={options.badgeBg}
                padding={{ left: 1, right: 1 }}
              >
                <text color={options.badgeColor}>{options.badgeText}</text>
              </box>
            ) : null}
            <text color={metaColor}>{headerSuffix(options)}</text>
          </box>
          {bodyPresenter.render()}
        </box>
      ) as never;
    },
  } satisfies VirtualItem;
}

function createPreparedTextPresenter(
  options: PreparedTextVirtualItemOptions,
): PreparedTextPresenter {
  const prepared = options.prepared ?? prepareText(options.text, options.prepare);
  const styledSegments =
    options.renderMode === "ansi"
      ? buildStyledSegments(options.text, prepared, options.prepare)
      : undefined;
  const estimatedMeasuredWords =
    options.estimatedMeasuredWords ??
    Math.max(options.text.trim().split(/\s+/).filter(Boolean).length, 1);

  let renderRows: PreparedTextRenderedRow[] = [];
  let renderWidth = 0;

  function materializeRows(
    width: number,
    measure: Pick<TextMeasureApi, "walkTextRows" | "materializeTextRow">,
  ): PreparedTextRenderedRow[] {
    const rows: Array<{ range: TextRowRange; text: string; width: number }> = [];
    measure.walkTextRows(prepared, { columns: width }, (range) => {
      const materialized = measure.materializeTextRow(prepared, range);
      rows.push({ range, text: materialized.text, width: materialized.width });
    });

    return rows.map((entry, index) => {
      const row: PreparedTextRenderedRow = {
        index,
        lineIndex: entry.range.start.segmentIndex,
        text: entry.text,
        width: entry.width,
        continued: entry.range.start.clusterIndex > 0,
        totalRows: rows.length,
        range: entry.range,
        runs: [],
      };
      const fallbackColor = resolveRowValue(options.rowColor, row);
      row.runs = materializeRowRuns(styledSegments, row, fallbackColor);
      return row;
    });
  }

  return {
    measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement {
      const layout = measure.layoutText(prepared, { columns: width });
      renderWidth = width;
      renderRows = materializeRows(width, measure);
      return {
        height: layout.rowCount,
        estimatedElements: (options.estimatedElementsPerRow ?? 1) * Math.max(layout.rowCount, 1),
        estimatedMeasuredWords,
      };
    },
    render() {
      if (renderRows.length === 0 && renderWidth > 0) {
        renderRows = materializeRows(renderWidth, { walkTextRows, materializeTextRow });
      }

      const rows = renderRows.length > 0 ? renderRows : [createEmptyRow()];
      return (
        <box width={grow()} direction="ttb" bg={options.containerBg}>
          {rows.map((row) =>
            options.renderRow ? options.renderRow(row) : renderPreparedTextRow(row, options),
          )}
        </box>
      ) as never;
    },
  } satisfies PreparedTextPresenter;
}

function renderPreparedTextRow(
  row: PreparedTextRenderedRow,
  options: Pick<PreparedTextVirtualItemOptions, "rowColor" | "rowBg">,
): JSX.Element {
  const fallbackColor = resolveRowValue(options.rowColor, row);
  const rowBg = resolveRowValue(options.rowBg, row);
  const runs = row.runs.length > 0 ? row.runs : [{ text: row.text, color: fallbackColor }];

  return (
    <box width={grow()} height={fixed(1)} bg={rowBg}>
      {runs.map((run) => (
        <text color={run.color}>{run.text}</text>
      ))}
    </box>
  ) as never;
}

function createEmptyRow(): PreparedTextRenderedRow {
  return {
    index: 0,
    lineIndex: 0,
    text: "",
    width: 0,
    continued: false,
    totalRows: 1,
    range: {
      width: 0,
      start: { segmentIndex: 0, clusterIndex: 0 },
      end: { segmentIndex: 0, clusterIndex: 0 },
    },
    runs: [],
  };
}

function resolveRowValue<T>(
  resolver: RowValueResolver<T> | undefined,
  row: PreparedTextRenderedRow,
): T | undefined {
  if (typeof resolver === "function") {
    return resolver(row);
  }
  return resolver;
}

function materializeRowRuns(
  styledSegments: StyledSegment[] | undefined,
  row: Pick<PreparedTextRenderedRow, "text" | "range">,
  fallbackColor: number | undefined,
): PreparedTextRowRun[] {
  if (!styledSegments) {
    return row.text.length > 0 || fallbackColor !== undefined
      ? [{ text: row.text, color: fallbackColor }]
      : [];
  }

  const segment = styledSegments[row.range.start.segmentIndex];
  if (!segment) {
    return row.text.length > 0 || fallbackColor !== undefined
      ? [{ text: row.text, color: fallbackColor }]
      : [];
  }

  const endClusterIndex =
    row.range.end.segmentIndex !== row.range.start.segmentIndex
      ? segment.clusters.length
      : row.range.end.clusterIndex;
  const clusters = segment.clusters.slice(row.range.start.clusterIndex, endClusterIndex);
  if (clusters.length === 0) {
    return row.text.length > 0 || fallbackColor !== undefined
      ? [{ text: row.text, color: fallbackColor }]
      : [];
  }

  const runs: PreparedTextRowRun[] = [];
  for (const cluster of clusters) {
    const color = cluster.color ?? fallbackColor;
    const previous = runs[runs.length - 1];
    if (previous && previous.color === color) {
      previous.text += cluster.text;
      continue;
    }
    runs.push({ text: cluster.text, color });
  }

  return runs.map((run) => ({ ...run }));
}

function buildStyledSegments(
  source: string,
  prepared: PreparedText,
  options: PrepareTextOptions | undefined,
): StyledSegment[] | undefined {
  const normalizedOptions = normalizePrepareOptions(options);
  if (normalizedOptions.ansi !== "skip-csi-osc") {
    return undefined;
  }

  const preparedState = prepared as PreparedText & {
    segments: Array<{ clusters: Array<{ text: string }> }>;
  };
  const parsed = parseStyledSegments(source, normalizedOptions);
  if (parsed.length !== preparedState.segments.length) {
    return undefined;
  }
  for (let index = 0; index < parsed.length; index++) {
    if (parsed[index]!.clusters.length !== preparedState.segments[index]!.clusters.length) {
      return undefined;
    }
  }
  return parsed;
}

function normalizePrepareOptions(
  options: PrepareTextOptions | undefined,
): Required<PrepareTextOptions> {
  return {
    ansi: options?.ansi ?? defaultPrepareOptions.ansi,
    whiteSpace: options?.whiteSpace ?? defaultPrepareOptions.whiteSpace,
    tabs: options?.tabs ?? defaultPrepareOptions.tabs,
  };
}

function parseStyledSegments(
  source: string,
  options: Required<PrepareTextOptions>,
): StyledSegment[] {
  const lines: StyledCodePoint[][] = [[]];
  let color: number | undefined;

  for (let index = 0; index < source.length; ) {
    const ansi = parseAnsiSequence(source, index);
    if (options.ansi === "skip-csi-osc" && ansi) {
      if (ansi.sgr) {
        color = applySgrCodes(color, ansi.sgr);
      }
      index += ansi.length;
      continue;
    }

    const symbol = String.fromCodePoint(source.codePointAt(index)!);
    index += symbol.length;

    if (symbol === "\r") {
      if (source[index] === "\n") {
        index += 1;
      }
      lines.push([]);
      continue;
    }

    if (symbol === "\n") {
      lines.push([]);
      continue;
    }

    if (symbol === "\t" && options.whiteSpace === "pre-wrap") {
      for (let repeat = 0; repeat < Math.max(options.tabs, 1); repeat++) {
        lines[lines.length - 1]!.push({ text: " ", color });
      }
      continue;
    }

    lines[lines.length - 1]!.push({ text: symbol, color });
  }

  if (lines.length > 0 && lines[lines.length - 1]!.length === 0 && source.endsWith("\n")) {
    lines.pop();
  }

  return lines.map((line) => ({
    clusters: toStyledClusters(
      options.whiteSpace === "normal" ? normalizeWhitespaceTokens(line) : line,
    ),
  }));
}

function normalizeWhitespaceTokens(tokens: StyledCodePoint[]): StyledCodePoint[] {
  const normalized: StyledCodePoint[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!;
    if (isCollapsibleWhitespace(token.text)) {
      const color = token.color;
      while (index < tokens.length && isCollapsibleWhitespace(tokens[index]!.text)) {
        index += 1;
      }
      if (normalized.length > 0) {
        normalized.push({ text: " ", color });
      }
      continue;
    }

    normalized.push(token);
    index += 1;
  }

  while (normalized[0]?.text === " ") {
    normalized.shift();
  }
  while (normalized[normalized.length - 1]?.text === " ") {
    normalized.pop();
  }

  return normalized;
}

function toStyledClusters(tokens: StyledCodePoint[]): StyledCluster[] {
  if (tokens.length === 0) {
    return [];
  }

  const text = tokens.map((token) => token.text).join("");
  const offsets: number[] = [];
  let offset = 0;
  for (const token of tokens) {
    offsets.push(offset);
    offset += token.text.length;
  }

  const parts = Array.from(graphemeSegmenter.segment(text));
  const clusters: StyledCluster[] = [];
  let tokenIndex = 0;

  for (const part of parts) {
    while (tokenIndex + 1 < offsets.length && offsets[tokenIndex + 1]! <= part.index) {
      tokenIndex += 1;
    }
    clusters.push({ text: part.segment, color: tokens[tokenIndex]?.color });
  }

  return clusters;
}

function isCollapsibleWhitespace(text: string): boolean {
  return text === " " || text === "\t" || text === "\f" || text === "\v";
}

function parseAnsiSequence(text: string, index: number): { length: number; sgr?: number[] } | null {
  if (text[index] !== "\x1b") {
    return null;
  }

  const kind = text[index + 1];
  if (kind === "[") {
    let end = index + 2;
    while (end < text.length) {
      const code = text.charCodeAt(end);
      if (code >= 0x40 && code <= 0x7e) {
        const final = text[end]!;
        if (final === "m") {
          const raw = text.slice(index + 2, end);
          const sgr = raw.length === 0 ? [0] : raw.split(";").map((part) => Number(part || "0"));
          return { length: end - index + 1, sgr };
        }
        return { length: end - index + 1 };
      }
      end += 1;
    }
    return null;
  }

  if (kind === "]") {
    let end = index + 2;
    while (end < text.length) {
      if (text[end] === "\u0007") {
        return { length: end - index + 1 };
      }
      if (text[end] === "\x1b" && text[end + 1] === "\\") {
        return { length: end - index + 2 };
      }
      end += 1;
    }
  }

  return null;
}

function applySgrCodes(current: number | undefined, codes: number[]): number | undefined {
  let color = current;
  let index = 0;

  while (index < codes.length) {
    const code = codes[index] ?? 0;

    if (code === 0 || code === 39) {
      color = undefined;
      index += 1;
      continue;
    }

    if (code >= 30 && code <= 37) {
      color = ANSI_BASE_COLORS[code - 30];
      index += 1;
      continue;
    }

    if (code >= 90 && code <= 97) {
      color = ANSI_BRIGHT_COLORS[code - 90];
      index += 1;
      continue;
    }

    if (code === 38) {
      const mode = codes[index + 1];
      if (mode === 5 && codes[index + 2] !== undefined) {
        color = xterm256Color(codes[index + 2]!);
        index += 3;
        continue;
      }
      if (
        mode === 2 &&
        codes[index + 2] !== undefined &&
        codes[index + 3] !== undefined &&
        codes[index + 4] !== undefined
      ) {
        color = rgb(codes[index + 2]!, codes[index + 3]!, codes[index + 4]!);
        index += 5;
        continue;
      }
    }

    index += 1;
  }

  return color;
}

function xterm256Color(index: number): number {
  if (index < 0) {
    return ANSI_BASE_COLORS[0];
  }
  if (index < 8) {
    return ANSI_BASE_COLORS[index]!;
  }
  if (index < 16) {
    return ANSI_BRIGHT_COLORS[index - 8]!;
  }
  if (index < 232) {
    const cube = index - 16;
    const r = Math.floor(cube / 36);
    const g = Math.floor((cube % 36) / 6);
    const b = cube % 6;
    const values = [0, 95, 135, 175, 215, 255] as const;
    return rgb(values[r]!, values[g]!, values[b]!);
  }
  const gray = 8 + (index - 232) * 10;
  return rgb(gray, gray, gray);
}

function rgb(red: number, green: number, blue: number): number {
  return ((0xff << 24) | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff)) >>> 0;
}

function defaultCollapsedSummary(kind: TranscriptVirtualItemKind): string {
  return kind === "thinking" ? "Thinking block collapsed." : "Collapsed transcript block.";
}

function headerSuffix(options: TranscriptVirtualItemOptions): string {
  const segments: string[] = [];
  if (options.timestamp) {
    segments.push(options.timestamp);
  }
  if (options.kind === "thinking") {
    segments.push(options.collapsed ? "thinking hidden" : "thinking");
  } else if (options.kind === "system") {
    segments.push("system");
  }
  return segments.length > 0 ? ` · ${segments.join(" · ")}` : "";
}
