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

export function createVirtualItemsBuffer(options: VirtualItemsBufferOptions): BufferModel {
  return {
    id: options.id,
    kind: options.kind ?? "virtual-items",
    version: options.version ?? 1,
    resolveContent(window: BufferWindowModel): BufferResolvedContent {
      const items = typeof options.items === "function" ? options.items(window) : options.items;
      return {
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
