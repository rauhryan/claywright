import { createMemo } from "solid-js";
import { stateful } from "../component-flags";
import type { JSX } from "../jsx-runtime";
import { OpNode } from "../opnode";
import { BufferWorkspace } from "./BufferWorkspace";
import {
  createPreparedTextBuffer,
  createTranscriptBuffer,
  type PreparedTextBufferBlock,
  type TranscriptBufferEntry,
} from "./buffers";
import type { BufferModel, BufferWindowModel, BufferWorkspaceProps, WindowMode } from "./types";

const AUTHORED_NODE = Symbol("authored-buffer-window-node");

type AuthoredNodeKind =
  | "prepared-text-buffer"
  | "prepared-text-block"
  | "transcript-buffer"
  | "transcript-entry"
  | "external-buffer"
  | "window";

interface AuthoredNodeBase<TKind extends AuthoredNodeKind, TProps extends object> {
  [AUTHORED_NODE]: true;
  kind: TKind;
  props: TProps;
}

export interface AuthoredPreparedTextBlockProps extends PreparedTextBufferBlock {
  children?: unknown;
}

export interface AuthoredPreparedTextBufferProps {
  id: string;
  kind?: string;
  version?: string | number;
  initialAutoFollow?: boolean;
  children?: unknown;
}

export interface AuthoredTranscriptEntryProps extends TranscriptBufferEntry {
  children?: unknown;
}

export interface AuthoredTranscriptBufferProps {
  id: string;
  kind?: string;
  version?: string | number;
  initialAutoFollow?: boolean;
  children?: unknown;
}

export interface AuthoredExternalBufferProps {
  buffer: BufferModel;
  children?: unknown;
}

export interface AuthoredWindowProps extends BufferWindowModel {
  children?: unknown;
}

export type AuthoredPreparedTextBlockNode = AuthoredNodeBase<
  "prepared-text-block",
  AuthoredPreparedTextBlockProps
>;
export type AuthoredPreparedTextBufferNode = AuthoredNodeBase<
  "prepared-text-buffer",
  AuthoredPreparedTextBufferProps
>;
export type AuthoredTranscriptEntryNode = AuthoredNodeBase<
  "transcript-entry",
  AuthoredTranscriptEntryProps
>;
export type AuthoredTranscriptBufferNode = AuthoredNodeBase<
  "transcript-buffer",
  AuthoredTranscriptBufferProps
>;
export type AuthoredExternalBufferNode = AuthoredNodeBase<
  "external-buffer",
  AuthoredExternalBufferProps
>;
export type AuthoredWindowNode = AuthoredNodeBase<"window", AuthoredWindowProps>;

export type AuthoredDescriptor =
  | AuthoredPreparedTextBlockNode
  | AuthoredPreparedTextBufferNode
  | AuthoredTranscriptEntryNode
  | AuthoredTranscriptBufferNode
  | AuthoredExternalBufferNode
  | AuthoredWindowNode;

interface NormalizedPreparedTextBufferNode {
  kind: "prepared-text-buffer";
  id: string;
  bufferKind?: string;
  version?: string | number;
  initialAutoFollow?: boolean;
  blocks: readonly PreparedTextBufferBlock[];
}

interface NormalizedTranscriptBufferNode {
  kind: "transcript-buffer";
  id: string;
  bufferKind?: string;
  version?: string | number;
  initialAutoFollow?: boolean;
  entries: readonly TranscriptBufferEntry[];
}

interface NormalizedExternalBufferNode {
  kind: "external-buffer";
  buffer: BufferModel;
}

interface NormalizedWindowNode {
  kind: "window";
  window: BufferWindowModel;
}

type NormalizedBufferNode =
  | NormalizedPreparedTextBufferNode
  | NormalizedTranscriptBufferNode
  | NormalizedExternalBufferNode;

interface NormalizedWorkspaceDefinition {
  buffers: readonly NormalizedBufferNode[];
  windows: readonly NormalizedWindowNode[];
}

export interface CompiledAuthoredWorkspace {
  buffers: readonly BufferModel[];
  windows: readonly BufferWindowModel[];
}

export interface AuthoredWorkspaceCompiler {
  compile(input: unknown): CompiledAuthoredWorkspace;
}

export interface AuthoredBufferWorkspaceProps extends Omit<
  BufferWorkspaceProps,
  "buffers" | "windows"
> {
  children?: unknown;
  compiler?: AuthoredWorkspaceCompiler;
}

interface CachedBufferEntry {
  signature: string;
  buffer: BufferModel;
}

interface CachedWindowEntry {
  signature: string;
  window: BufferWindowModel;
}

interface SignatureSerializer {
  serialize(value: unknown): string;
}

export function AuthoredPreparedTextBlock(
  props: AuthoredPreparedTextBlockProps,
): AuthoredPreparedTextBlockNode {
  return createAuthoredNode("prepared-text-block", props);
}

export function AuthoredPreparedTextBuffer(
  props: AuthoredPreparedTextBufferProps,
): AuthoredPreparedTextBufferNode {
  return createAuthoredNode("prepared-text-buffer", props);
}

export function AuthoredTranscriptEntry(
  props: AuthoredTranscriptEntryProps,
): AuthoredTranscriptEntryNode {
  return createAuthoredNode("transcript-entry", props);
}

export function AuthoredTranscriptBuffer(
  props: AuthoredTranscriptBufferProps,
): AuthoredTranscriptBufferNode {
  return createAuthoredNode("transcript-buffer", props);
}

export function AuthoredExternalBuffer(
  props: AuthoredExternalBufferProps,
): AuthoredExternalBufferNode {
  return createAuthoredNode("external-buffer", props);
}

export function AuthoredWindow(props: AuthoredWindowProps): AuthoredWindowNode {
  return createAuthoredNode("window", props);
}

export function createAuthoredWorkspaceCompiler(): AuthoredWorkspaceCompiler {
  const bufferCache = new Map<string, CachedBufferEntry>();
  const windowCache = new Map<string, CachedWindowEntry>();
  const serializer = createSignatureSerializer();

  return {
    compile(input: unknown): CompiledAuthoredWorkspace {
      const normalized = normalizeWorkspace(input);
      const seenBufferIds = new Set<string>();
      const seenWindowIds = new Set<string>();
      const compiledBuffers: BufferModel[] = [];
      const compiledWindows: BufferWindowModel[] = [];

      for (const bufferNode of normalized.buffers) {
        if (bufferNode.kind === "external-buffer") {
          const bufferId = bufferNode.buffer.id;
          if (seenBufferIds.has(bufferId)) {
            throw new Error(`Duplicate authored buffer id \"${bufferId}\".`);
          }
          seenBufferIds.add(bufferId);
          compiledBuffers.push(bufferNode.buffer);
          continue;
        }

        if (seenBufferIds.has(bufferNode.id)) {
          throw new Error(`Duplicate authored buffer id \"${bufferNode.id}\".`);
        }
        seenBufferIds.add(bufferNode.id);

        const signature = serializer.serialize(bufferNode);
        const cached = bufferCache.get(bufferNode.id);
        if (cached && cached.signature === signature) {
          compiledBuffers.push(cached.buffer);
          continue;
        }

        const compiledBuffer =
          bufferNode.kind === "prepared-text-buffer"
            ? createPreparedTextBuffer({
                id: bufferNode.id,
                kind: bufferNode.bufferKind,
                version: bufferNode.version,
                blocks: bufferNode.blocks,
                initialAutoFollow: bufferNode.initialAutoFollow,
              })
            : createTranscriptBuffer({
                id: bufferNode.id,
                kind: bufferNode.bufferKind,
                version: bufferNode.version,
                entries: bufferNode.entries,
                initialAutoFollow: bufferNode.initialAutoFollow,
              });

        bufferCache.set(bufferNode.id, {
          signature,
          buffer: compiledBuffer,
        });
        compiledBuffers.push(compiledBuffer);
      }

      for (const windowNode of normalized.windows) {
        const windowId = windowNode.window.id;
        if (seenWindowIds.has(windowId)) {
          throw new Error(`Duplicate authored window id \"${windowId}\".`);
        }
        seenWindowIds.add(windowId);

        if (!seenBufferIds.has(windowNode.window.bufferId)) {
          throw new Error(
            `Authored window \"${windowId}\" references unresolved buffer \"${windowNode.window.bufferId}\".`,
          );
        }

        const signature = serializer.serialize(windowNode.window);
        const cached = windowCache.get(windowId);
        if (cached && cached.signature === signature) {
          compiledWindows.push(cached.window);
          continue;
        }

        const compiledWindow = { ...windowNode.window } satisfies BufferWindowModel;
        windowCache.set(windowId, { signature, window: compiledWindow });
        compiledWindows.push(compiledWindow);
      }

      cleanupCache(bufferCache, seenBufferIds);
      cleanupCache(windowCache, seenWindowIds);

      return {
        buffers: compiledBuffers,
        windows: compiledWindows,
      } satisfies CompiledAuthoredWorkspace;
    },
  } satisfies AuthoredWorkspaceCompiler;
}

export function compileAuthoredWorkspace(
  input: unknown,
  compiler: AuthoredWorkspaceCompiler = createAuthoredWorkspaceCompiler(),
): CompiledAuthoredWorkspace {
  return compiler.compile(input);
}

export const AuthoredBufferWorkspace = stateful(function AuthoredBufferWorkspace(
  rawProps: AuthoredBufferWorkspaceProps,
) {
  const localCompiler = createAuthoredWorkspaceCompiler();
  const compiler = createMemo(() => rawProps.compiler ?? localCompiler);
  const compiled = createMemo(() => compiler().compile(rawProps.children));

  return (
    <BufferWorkspace
      activeWindowId={rawProps.activeWindowId}
      initialActiveWindowId={rawProps.initialActiveWindowId}
      onActiveWindowChange={rawProps.onActiveWindowChange}
      manageKeyboardFocus={rawProps.manageKeyboardFocus}
      focusable={rawProps.focusable}
      enableArrowKeys={rawProps.enableArrowKeys}
      keyStepRows={rawProps.keyStepRows}
      onKeyDown={rawProps.onKeyDown}
      onKeyUp={rawProps.onKeyUp}
      onFocus={rawProps.onFocus}
      onBlur={rawProps.onBlur}
      width={rawProps.width}
      height={rawProps.height}
      direction={rawProps.direction}
      padding={rawProps.padding}
      gap={rawProps.gap}
      alignX={rawProps.alignX}
      alignY={rawProps.alignY}
      bg={rawProps.bg}
      border={rawProps.border}
      cornerRadius={rawProps.cornerRadius}
      windowProps={rawProps.windowProps}
      emptyState={rawProps.emptyState}
      buffers={compiled().buffers}
      windows={compiled().windows}
    />
  ) as never;
});

function createAuthoredNode<TKind extends AuthoredNodeKind, TProps extends object>(
  kind: TKind,
  props: TProps,
): AuthoredNodeBase<TKind, TProps> {
  return {
    [AUTHORED_NODE]: true,
    kind,
    props,
  } satisfies AuthoredNodeBase<TKind, TProps>;
}

function normalizeWorkspace(input: unknown): NormalizedWorkspaceDefinition {
  const topLevelNodes = flattenAuthoredValue(input, "workspace");
  const buffers: NormalizedBufferNode[] = [];
  const windows: NormalizedWindowNode[] = [];

  for (const node of topLevelNodes) {
    switch (node.kind) {
      case "prepared-text-buffer":
        buffers.push(normalizePreparedTextBuffer(node));
        break;
      case "transcript-buffer":
        buffers.push(normalizeTranscriptBuffer(node));
        break;
      case "external-buffer":
        assertNoChildren(node.props.children, "external-buffer");
        buffers.push({ kind: "external-buffer", buffer: node.props.buffer });
        break;
      case "window":
        assertNoChildren(node.props.children, "window");
        windows.push({
          kind: "window",
          window: {
            id: node.props.id,
            bufferId: node.props.bufferId,
            mode: node.props.mode,
            title: node.props.title,
            viewState: node.props.viewState,
            focusable: node.props.focusable,
            initialAutoFollow: node.props.initialAutoFollow,
            showTrack: node.props.showTrack,
            trackSide: node.props.trackSide,
            requestedTrackSize: node.props.requestedTrackSize,
            floating: node.props.floating,
            chrome: node.props.chrome,
          },
        });
        break;
      case "prepared-text-block":
        throw new Error(
          'Invalid authored workspace child kind "prepared-text-block". Blocks must be nested inside AuthoredPreparedTextBuffer.',
        );
      case "transcript-entry":
        throw new Error(
          'Invalid authored workspace child kind "transcript-entry". Entries must be nested inside AuthoredTranscriptBuffer.',
        );
      default:
        node satisfies never;
    }
  }

  return {
    buffers,
    windows,
  } satisfies NormalizedWorkspaceDefinition;
}

function normalizePreparedTextBuffer(
  node: AuthoredPreparedTextBufferNode,
): NormalizedPreparedTextBufferNode {
  const children = flattenAuthoredValue(
    node.props.children,
    `prepared-text-buffer:${node.props.id}`,
  );
  const blocks: PreparedTextBufferBlock[] = [];
  const blockKeys = new Set<string>();

  for (const child of children) {
    if (child.kind !== "prepared-text-block") {
      throw new Error(
        `Invalid child kind \"${child.kind}\" inside prepared-text buffer \"${node.props.id}\". Only AuthoredPreparedTextBlock is allowed.`,
      );
    }
    assertNoChildren(child.props.children, "prepared-text-block");
    if (blockKeys.has(child.props.key)) {
      throw new Error(
        `Duplicate authored prepared-text block key \"${child.props.key}\" in buffer \"${node.props.id}\".`,
      );
    }
    blockKeys.add(child.props.key);
    blocks.push({
      key: child.props.key,
      text: child.props.text,
      version: child.props.version,
      prepare: child.props.prepare,
      estimatedElementsPerRow: child.props.estimatedElementsPerRow,
      estimatedMeasuredWords: child.props.estimatedMeasuredWords,
      containerBg: child.props.containerBg,
      rowColor: child.props.rowColor,
      rowBg: child.props.rowBg,
      renderMode: child.props.renderMode,
      renderRow: child.props.renderRow,
    });
  }

  return {
    kind: "prepared-text-buffer",
    id: node.props.id,
    bufferKind: node.props.kind,
    version: node.props.version,
    initialAutoFollow: node.props.initialAutoFollow,
    blocks,
  } satisfies NormalizedPreparedTextBufferNode;
}

function normalizeTranscriptBuffer(
  node: AuthoredTranscriptBufferNode,
): NormalizedTranscriptBufferNode {
  const children = flattenAuthoredValue(node.props.children, `transcript-buffer:${node.props.id}`);
  const entries: TranscriptBufferEntry[] = [];
  const entryKeys = new Set<string>();

  for (const child of children) {
    if (child.kind !== "transcript-entry") {
      throw new Error(
        `Invalid child kind \"${child.kind}\" inside transcript buffer \"${node.props.id}\". Only AuthoredTranscriptEntry is allowed.`,
      );
    }
    assertNoChildren(child.props.children, "transcript-entry");
    if (entryKeys.has(child.props.key)) {
      throw new Error(
        `Duplicate authored transcript entry key \"${child.props.key}\" in buffer \"${node.props.id}\".`,
      );
    }
    entryKeys.add(child.props.key);
    entries.push({
      key: child.props.key,
      speaker: child.props.speaker,
      text: child.props.text,
      version: child.props.version,
      timestamp: child.props.timestamp,
      kind: child.props.kind,
      collapsedSummary: child.props.collapsedSummary,
      badgeText: child.props.badgeText,
      badgeColor: child.props.badgeColor,
      badgeBg: child.props.badgeBg,
      prepare: child.props.prepare,
      renderMode: child.props.renderMode,
      estimatedElementsPerRow: child.props.estimatedElementsPerRow,
      estimatedMeasuredWords: child.props.estimatedMeasuredWords,
      containerBg: child.props.containerBg,
      headerBg: child.props.headerBg,
      speakerColor: child.props.speakerColor,
      metaColor: child.props.metaColor,
      bodyColor: child.props.bodyColor,
      bodyBg: child.props.bodyBg,
    });
  }

  return {
    kind: "transcript-buffer",
    id: node.props.id,
    bufferKind: node.props.kind,
    version: node.props.version,
    initialAutoFollow: node.props.initialAutoFollow,
    entries,
  } satisfies NormalizedTranscriptBufferNode;
}

function flattenAuthoredValue(input: unknown, context: string): AuthoredDescriptor[] {
  let current = input;
  while (typeof current === "function") {
    current = current();
  }

  if (current == null || typeof current === "boolean") {
    return [];
  }

  if (Array.isArray(current)) {
    return current.flatMap((value) => flattenAuthoredValue(value, context));
  }

  if (isAuthoredDescriptor(current)) {
    return [current];
  }

  if (current instanceof OpNode) {
    throw new Error(
      `Unsupported authored ${context} child: UI node <${current.type}>. Render ordinary widgets outside AuthoredBufferWorkspace.`,
    );
  }

  if (typeof current === "string" || typeof current === "number") {
    throw new Error(
      `Unsupported authored ${context} child: ${JSON.stringify(current)}. Expected authored descriptor nodes only.`,
    );
  }

  throw new Error(
    `Unsupported authored ${context} child of type ${describeValue(current)}. Expected authored descriptor nodes only.`,
  );
}

function isAuthoredDescriptor(value: unknown): value is AuthoredDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    AUTHORED_NODE in value &&
    (value as Record<typeof AUTHORED_NODE, unknown>)[AUTHORED_NODE] === true
  );
}

function assertNoChildren(children: unknown, kind: AuthoredNodeKind | string): void {
  const normalized = flattenAuthoredValue(children, kind);
  if (normalized.length > 0) {
    throw new Error(`Authored node \"${kind}\" does not accept children.`);
  }
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function cleanupCache<T>(cache: Map<string, T>, retainedIds: ReadonlySet<string>): void {
  for (const key of cache.keys()) {
    if (!retainedIds.has(key)) {
      cache.delete(key);
    }
  }
}

function createSignatureSerializer(): SignatureSerializer {
  const objectIds = new WeakMap<object, number>();
  let nextObjectId = 1;

  function getObjectId(value: object): number {
    const existing = objectIds.get(value);
    if (existing !== undefined) return existing;
    const id = nextObjectId++;
    objectIds.set(value, id);
    return id;
  }

  function serialize(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const type = typeof value;
    switch (type) {
      case "string":
        return JSON.stringify(value);
      case "number":
      case "boolean":
      case "bigint":
        return String(value);
      case "symbol":
        return `symbol:${String(value)}`;
      case "function":
        return `fn:${getObjectId(value as object)}`;
      case "object": {
        if (Array.isArray(value)) {
          return `[${value.map((entry) => serialize(entry)).join(",")}]`;
        }
        if (value instanceof Date) {
          return `date:${value.toISOString()}`;
        }
        if (!isPlainObject(value)) {
          return `obj:${getObjectId(value as object)}`;
        }
        const keys = Object.keys(value).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key])}`).join(",")}}`;
      }
      default:
        return type;
    }
  }

  return { serialize } satisfies SignatureSerializer;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
