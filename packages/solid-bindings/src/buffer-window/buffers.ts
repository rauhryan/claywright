import { prepareText, type PreparedText } from "clayterm";
import {
  createPreparedTextVirtualItem,
  createTranscriptVirtualItem,
  type PreparedTextVirtualItemOptions,
  type TranscriptVirtualItemOptions,
} from "../virtual-scroll/text-items";
import type { VirtualItem } from "../virtual-scroll/types";
import type {
  BufferModel,
  BufferResolvedContent,
  BufferWindowModel,
  BufferWindowViewState,
  TextStreamBufferSnapshot,
} from "./types";

export interface VirtualItemsBufferOptions {
  id: string;
  kind?: string;
  version?: string | number;
  items: readonly VirtualItem[] | ((window: BufferWindowModel) => readonly VirtualItem[]);
  initialAutoFollow?: boolean;
}

export interface PreparedTextBufferBlock extends Omit<PreparedTextVirtualItemOptions, "prepared"> {
  prepared?: PreparedText;
}

export interface PreparedTextBufferOptions {
  id: string;
  kind?: string;
  version?: string | number;
  blocks: readonly PreparedTextBufferBlock[];
  initialAutoFollow?: boolean;
}

export interface TranscriptBufferViewState extends BufferWindowViewState {
  collapsedKeys?: Readonly<Record<string, boolean>>;
}

export interface TranscriptBufferEntry extends Omit<
  TranscriptVirtualItemOptions,
  "collapsed" | "prepared" | "collapsedPrepared"
> {
  prepared?: PreparedText;
  collapsedPrepared?: PreparedText;
}

export interface TranscriptBufferOptions {
  id: string;
  kind?: string;
  version?: string | number;
  entries: readonly TranscriptBufferEntry[];
  initialAutoFollow?: boolean;
}

export interface TextStreamBufferOptions {
  id: string;
  kind?: string;
  maxLines?: number;
  lines?: readonly string[];
  initialAutoFollow?: boolean;
}

export interface TextStreamBufferModel extends BufferModel {
  appendLine(text: string): number;
  appendLines(lines: readonly string[]): number[];
  clear(): void;
  getSnapshot(): TextStreamBufferSnapshot;
}

export function createVirtualItemsBuffer(options: VirtualItemsBufferOptions): BufferModel {
  return {
    id: options.id,
    kind: options.kind ?? "virtual-items",
    version: options.version ?? 1,
    resolveContent(window: BufferWindowModel): BufferResolvedContent {
      const items = typeof options.items === "function" ? options.items(window) : options.items;
      return {
        kind: "items",
        items,
        initialAutoFollow: options.initialAutoFollow,
      };
    },
  } satisfies BufferModel;
}

export function createPreparedTextBuffer(options: PreparedTextBufferOptions): BufferModel {
  const cachedBlocks = options.blocks.map((block) => ({
    ...block,
    prepared: block.prepared ?? prepareText(block.text, block.prepare),
  }));

  return {
    id: options.id,
    kind: options.kind ?? "prepared-text",
    version: options.version ?? 1,
    resolveContent(): BufferResolvedContent {
      return {
        kind: "items",
        items: cachedBlocks.map((block) => createPreparedTextVirtualItem(block)),
        initialAutoFollow: options.initialAutoFollow,
      };
    },
  } satisfies BufferModel;
}

export function createTranscriptBuffer(options: TranscriptBufferOptions): BufferModel {
  const cachedEntries = options.entries.map((entry) => ({
    ...entry,
    prepared: entry.prepared ?? prepareText(entry.text, entry.prepare),
    collapsedPrepared:
      entry.collapsedPrepared ??
      (entry.collapsedSummary ? prepareText(entry.collapsedSummary, entry.prepare) : undefined),
  }));

  return {
    id: options.id,
    kind: options.kind ?? "transcript",
    version: options.version ?? 1,
    resolveContent(window: BufferWindowModel): BufferResolvedContent {
      const collapsedKeys = window.viewState?.collapsedKeys ?? {};
      return {
        kind: "items",
        items: cachedEntries.map((entry) => {
          const collapsed = collapsedKeys[entry.key] === true;
          return createTranscriptVirtualItem({
            ...entry,
            collapsed,
            version: `${entry.version ?? 1}:collapsed=${collapsed ? 1 : 0}`,
          });
        }),
        initialAutoFollow: options.initialAutoFollow,
      };
    },
  } satisfies BufferModel;
}

export function createTextStreamBuffer(options: TextStreamBufferOptions): TextStreamBufferModel {
  const maxLines = Math.max(1, options.maxLines ?? 10_000);
  const initialLines = [...(options.lines ?? [])];
  let snapshot: TextStreamBufferSnapshot = {
    version: 1,
    baseIndex: Math.max(initialLines.length - Math.min(initialLines.length, maxLines), 0),
    lines: initialLines.slice(-maxLines),
    maxLines,
  };
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function bumpVersion(previous: string | number): number {
    return typeof previous === "number" ? previous + 1 : 1;
  }

  function appendMany(lines: readonly string[]): number[] {
    if (lines.length === 0) return [];

    const nextLines = [...snapshot.lines];
    let nextBaseIndex = snapshot.baseIndex;
    const appendedIndexes: number[] = [];

    for (const line of lines) {
      nextLines.push(line);
      if (nextLines.length > snapshot.maxLines) {
        nextLines.shift();
        nextBaseIndex += 1;
      }
      appendedIndexes.push(nextBaseIndex + nextLines.length - 1);
    }

    snapshot = {
      version: bumpVersion(snapshot.version),
      baseIndex: nextBaseIndex,
      lines: nextLines,
      maxLines: snapshot.maxLines,
    };
    emit();
    return appendedIndexes;
  }

  return {
    get id() {
      return options.id;
    },
    get kind() {
      return options.kind ?? "text-stream";
    },
    get version() {
      return snapshot.version;
    },
    resolveContent(): BufferResolvedContent {
      return {
        kind: "text-stream",
        stream: snapshot,
        initialAutoFollow: options.initialAutoFollow,
      };
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    appendLine(text: string): number {
      return appendMany([text])[0]!;
    },
    appendLines(lines: readonly string[]): number[] {
      return appendMany(lines);
    },
    clear(): void {
      snapshot = {
        version: bumpVersion(snapshot.version),
        baseIndex: 0,
        lines: [],
        maxLines: snapshot.maxLines,
      };
      emit();
    },
    getSnapshot(): TextStreamBufferSnapshot {
      return snapshot;
    },
  } satisfies TextStreamBufferModel;
}
