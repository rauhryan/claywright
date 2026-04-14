export { render, grow, fixed, percent, fit, rgba } from "./render";
export {
  AppContextProvider,
  runApp,
  useAppContext,
  type AppOptions,
  type AppContext,
  type AppView,
} from "./runtime";
export { Portal } from "./Portal";
export { ATTACH_POINT, ATTACH_TO, POINTER_CAPTURE_MODE, CLIP_TO } from "clayterm";
export {
  action,
  createContext,
  createEffect,
  createMemo,
  createOptimistic,
  createOptimisticStore,
  createProjection,
  createRoot,
  createSignal,
  createStore,
  createTrackedEffect,
  deep,
  Errored,
  flush,
  For,
  isPending,
  isRefreshing,
  lazy,
  latest,
  Loading,
  Match,
  merge,
  omit,
  onCleanup,
  onSettled,
  refresh,
  Repeat,
  resolve,
  runWithOwner,
  Show,
  snapshot,
  storePath,
  Switch,
  untrack,
  useContext,
} from "solid-js";
export {
  RootNode,
  ElementNode,
  TextNode,
  type TerminalNode,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  mergeProps,
  ref,
  applyRef,
  createComponent,
  setProp,
  renderToString,
  effect,
  memo,
  jsx,
  jsxs,
  jsxDEV,
} from "./jsx-runtime";
export { OpNode, ElementOpNode, TextOpNode, SlotOpNode, resetIdCounter } from "./opnode";
export { markStatefulComponent } from "./component-flags";
export { BufferWindow } from "./buffer-window/BufferWindow";
export { BufferWorkspace } from "./buffer-window/BufferWorkspace";
export {
  AuthoredBufferWorkspace,
  AuthoredExternalBuffer,
  AuthoredPreparedTextBlock,
  AuthoredPreparedTextBuffer,
  AuthoredTranscriptBuffer,
  AuthoredTranscriptEntry,
  AuthoredWindow,
  compileAuthoredWorkspace,
  createAuthoredWorkspaceCompiler,
} from "./buffer-window/authoring";
export {
  createPreparedTextBuffer,
  createTextStreamBuffer,
  createTranscriptBuffer,
  createVirtualItemsBuffer,
} from "./buffer-window/buffers";
export {
  createBufferMap,
  partitionBufferWindowSurfaces,
  resolveActiveWindowId,
  resolveBufferWindowSurfaces,
} from "./buffer-window/compositor";
export { VirtualViewport } from "./virtual-scroll/VirtualViewport";
export { VirtualViewportTrack } from "./virtual-scroll/VirtualViewportTrack";
export {
  createPreparedTextVirtualItem,
  createTranscriptVirtualItem,
} from "./virtual-scroll/text-items";
export { computeViewportTrackGeometry } from "./virtual-scroll/track";
export type {
  AuthoredBufferWorkspaceProps,
  AuthoredDescriptor,
  AuthoredExternalBufferNode,
  AuthoredExternalBufferProps,
  AuthoredPreparedTextBlockNode,
  AuthoredPreparedTextBlockProps,
  AuthoredPreparedTextBufferNode,
  AuthoredPreparedTextBufferProps,
  AuthoredTranscriptBufferNode,
  AuthoredTranscriptBufferProps,
  AuthoredTranscriptEntryNode,
  AuthoredTranscriptEntryProps,
  AuthoredWindowNode,
  AuthoredWindowProps,
  AuthoredWorkspaceCompiler,
  CompiledAuthoredWorkspace,
} from "./buffer-window/authoring";
export type {
  BufferId,
  BufferModel,
  BufferResolvedContent,
  BufferWindowChrome,
  BufferWindowHandle,
  BufferWindowModel,
  BufferWindowProps,
  BufferWindowState,
  BufferWindowViewState,
  BufferWorkspaceProps,
  FloatingWindowConfig,
  ResolvedBufferWindowSurface,
  WindowId,
  WindowMode,
} from "./buffer-window/types";
export type {
  PreparedTextBufferBlock,
  PreparedTextBufferOptions,
  TextStreamBufferModel,
  TextStreamBufferOptions,
  TranscriptBufferEntry,
  TranscriptBufferOptions,
  TranscriptBufferViewState,
  VirtualItemsBufferOptions,
} from "./buffer-window/buffers";
export type {
  VirtualItem,
  VirtualItemMeasurement,
  VirtualViewportBudget,
  VirtualViewportHandle,
  VirtualViewportProps,
  VirtualViewportState,
} from "./virtual-scroll/types";
export type {
  PreparedTextRenderedRow,
  PreparedTextRowRun,
  PreparedTextVirtualItemOptions,
  TranscriptVirtualItemKind,
  TranscriptVirtualItemOptions,
} from "./virtual-scroll/text-items";
export type { VirtualViewportTrackGeometry } from "./virtual-scroll/track";
