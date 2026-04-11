# Normative Specification: Virtual Scroll and Text Measurement

## Status
Draft for review

## Abstract
This specification defines the normative API, data model, behavioral requirements, and deferred work for generic vertical virtualization and text measurement primitives in the Clay/solid terminal UI stack. It specifies a JS-owned virtual viewport, public text measurement helpers, geometry queries for Clay-rendered elements, wheel and keyboard scroll integration, and a transcript-oriented first consumer that supports streaming tail updates, budget-aware windowing, controllable auto-follow, and collapsible blocks.

## 1. Introduction

### 1.1 Purpose
This specification exists to standardize how the monorepo measures text, constrains Clay work, and renders large streaming transcript-like UIs without exhausting Clay arena memory, layout element capacity, or measured-word cache capacity.

The intended outcome is a reusable vertical virtualization primitive that is generic over ordered items, plus a small set of low-level measurement and geometry APIs that higher layers can depend on.

### 1.2 Scope
This specification covers:
- public text measurement APIs in `clayterm`
- public element-geometry queries for completed renders
- wheel-event routing and geometry delegation in `@tui/core`
- a generic `VirtualViewport` interface in `@tui/solid-bindings`
- normative viewport behavior for windowing, anchoring, auto-follow, and budget handling
- transcript-consumer behavior for append-plus-tail-rewrite streaming and collapsible thinking blocks
- explicit TODO tracking for deferred work

This specification does **not** cover:
- automatic virtualization of arbitrary JSX trees
- line-level virtualization
- reverse-flow / bottom-up layout
- horizontal virtualization or horizontal code scrolling
- text selection and copy semantics
- search/find behavior
- advanced markdown table layout guarantees
- nested independent scroll regions inside transcript blocks
- automatic fidelity degradation of expensive items
- logical focus preservation for unmounted virtualized content

### 1.3 Terminology
The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, and **MAY** in this document are to be interpreted as described in RFC 2119.

Additional terms used in this specification:
- **Item**: A single logical unit in the ordered vertical sequence managed by virtualization.
- **Viewport**: The clipped on-screen region through which the item sequence is viewed.
- **Materialized window**: The contiguous item range currently rendered into Clay.
- **Visible item**: An item whose measured bounds intersect the viewport.
- **Overscan**: Extra rows above and below the viewport that MAY be materialized to reduce churn during scroll.
- **Budget**: A set of estimated cost ceilings used to constrain materialization, especially estimated Clay element count and estimated measured-word count.
- **Tail rewrite**: Replacement or progressive enhancement of one or more items near the end of the sequence while earlier settled items remain stable.
- **Auto-follow**: A mode in which the viewport remains anchored to the end of the sequence as new content arrives.
- **At end**: A state where the viewport is within `endThresholdRows` of the maximum scroll position.

## 2. Functional Requirements

### 2.1 Text Measurement Requirements

#### REQ-001: Public Cell Width Measurement
`clayterm` MUST expose a public `measureCellWidth(text: string): number` function.

**Rationale**: Virtualization and rich block measurement need a low-level width primitive that is callable outside render-time.

**Acceptance Criteria**:
- [ ] The function is publicly exported from the package root.
- [ ] The function returns `0` for the empty string.
- [ ] The function uses the same terminal-cell width rules as Clay's terminal text measurement callback.
- [ ] Combining marks and other zero-width codepoints contribute `0` cells.
- [ ] Control characters with negative `wcwidth`-style width contribute `0` cells.

#### REQ-002: Public Text Wrapping
`clayterm` MUST expose a public `wrapText(text: string, width: number, options?: WrapTextOptions): WrappedLine[]` function.

**Rationale**: Rich block measurement needs deterministic wrapped-line output, not only aggregate height.

**Acceptance Criteria**:
- [ ] The function is publicly exported from the package root.
- [ ] The function accepts `mode: "words" | "newlines" | "none"` with `"words"` as the default.
- [ ] The function returns wrapped lines whose concatenation preserves the original text content, excluding removed newline separators.
- [ ] When `mode` is `"newlines"`, wrapping occurs only at newline boundaries.
- [ ] When `mode` is `"none"`, the output contains at most one non-empty line for non-empty input.
- [ ] When `width` is `0`, the function returns an empty array.

#### REQ-003: Public Wrapped Height Measurement
`clayterm` MUST expose a public `measureWrappedHeight(text: string, width: number, options?: WrapTextOptions): number` function.

**Rationale**: Many item types only need height, and a dedicated helper avoids duplicate line counting.

**Acceptance Criteria**:
- [ ] The function is publicly exported from the package root.
- [ ] The function returns `0` for the empty string.
- [ ] The function returns the same value as `wrapText(...).length` for the same inputs.
- [ ] The function returns `0` when `width` is `0`.

#### REQ-004: Measurement Input Validation
The text measurement functions in REQ-001 through REQ-003 MUST reject invalid `width` values.

**Rationale**: Virtualization math becomes undefined for negative or non-finite widths.

**Acceptance Criteria**:
- [ ] `wrapText` throws a `RangeError` when `width` is negative or non-finite.
- [ ] `measureWrappedHeight` throws a `RangeError` when `width` is negative or non-finite.
- [ ] `measureCellWidth` does not require a width parameter and therefore does not perform width validation.

### 2.2 Geometry and Layout Requirements

#### REQ-005: Completed-Render Element Bounds Query
`clayterm` MUST expose completed-render element bounds by stable element ID.

**Rationale**: A viewport participating in normal Clay layout needs actual measured bounds from the previous completed render.

**Acceptance Criteria**:
- [ ] The low-level interface includes `getElementBounds(id: string): ElementBounds | undefined`.
- [ ] The returned bounds contain `x`, `y`, `width`, and `height` in terminal cell coordinates.
- [ ] When the element ID is unknown for the last completed render, the method returns `undefined`.
- [ ] The method does not throw for unknown IDs.

#### REQ-006: Geometry Freshness Semantics
Element bounds queries MUST report geometry from the most recent completed render pass.

**Rationale**: Virtualization decisions are allowed to lag by one frame, but they must be deterministic and tied to a known render.

**Acceptance Criteria**:
- [ ] Bounds queried before the first completed render are `undefined`.
- [ ] Bounds queried after a completed render reflect that render's final layout.
- [ ] A subsequent render updates the stored bounds.

#### REQ-007: Core Geometry Delegation
`@tui/core` MUST expose geometry queries needed by higher layers.

**Rationale**: `@tui/solid-bindings` depends on `Renderer`, not directly on `clayterm` internals.

**Acceptance Criteria**:
- [ ] `Renderer` exposes `getElementBounds(id: string): ElementBounds | undefined`.
- [ ] The method delegates to the low-level term geometry source.
- [ ] The method preserves the `undefined` semantics from REQ-005.

### 2.3 Virtual Item Protocol Requirements

#### REQ-008: Explicit Ordered Item Protocol
`@tui/solid-bindings` MUST define virtualization over an explicit ordered item protocol and MUST NOT virtualize arbitrary child JSX trees automatically.

**Rationale**: Explicit item contracts make measurement, budget estimation, and anchor preservation testable and deterministic.

**Acceptance Criteria**:
- [ ] The public viewport interface accepts `items: readonly VirtualItem[]` or an equivalent typed ordered-item collection.
- [ ] The viewport API does not require or depend on arbitrary `children` as the virtualization source.
- [ ] The specification text explicitly states that automatic arbitrary-JSX virtualization is out of scope.

#### REQ-009: Stable Item Identity
Every `VirtualItem` MUST include a stable `key` string that uniquely identifies the logical item within the current sequence.

**Rationale**: Stable identity is required for caching, anchor preservation, and transcript tail rewrites.

**Acceptance Criteria**:
- [ ] Duplicate keys in one viewport instance are treated as an error.
- [ ] The viewport does not silently coalesce items with duplicate keys.
- [ ] Reordering or tail rewrite behavior can rely on key stability across updates.

#### REQ-010: Versioned Invalidation
Every `VirtualItem` MUST include a `version` field whose value changes whenever that item's height or rendered output may change for a fixed width.

**Rationale**: Measurement caches must know when to invalidate without guessing internal item semantics.

**Acceptance Criteria**:
- [ ] Measurement caching keys include at least `key`, `version`, and `width`.
- [ ] If `version` changes while `key` remains stable, cached measurements are invalidated.
- [ ] If `version` does not change and width does not change, cached measurements MAY be reused.

#### REQ-011: Width-Dependent Measurement Contract
Every `VirtualItem` MUST provide a width-dependent measurement contract.

**Rationale**: Markdown wrapping, code wrapping, math rendering, and collapse state all change height as width changes.

**Acceptance Criteria**:
- [ ] Each item exposes a `measure(width, measureApi)` function or an equivalent required measurement hook.
- [ ] The measurement result includes `height` in terminal rows.
- [ ] The measurement result MAY include estimated budgets such as `estimatedElements` and `estimatedMeasuredWords`.
- [ ] Negative or non-finite measurement results are treated as an error.

#### REQ-012: Measurement Result Validation
The viewport MUST validate item measurement output before using it.

**Rationale**: Invalid measurement results corrupt scroll math and can cause unstable anchor behavior.

**Acceptance Criteria**:
- [ ] Negative `height` values are rejected with a developer-visible error.
- [ ] Non-finite `height` values are rejected with a developer-visible error.
- [ ] Negative or non-finite budget estimates are rejected with a developer-visible error.

### 2.4 Viewport Materialization Requirements

#### REQ-013: Pre-Clay Virtualization
The viewport MUST determine the materialized window in JS before emitting Clay ops.

**Rationale**: Clay visibility culling does not reduce layout element or measured-word capacity usage for offscreen content.

**Acceptance Criteria**:
- [ ] Offscreen non-materialized items are absent from the Clay ops array.
- [ ] The implementation does not rely on Clay visibility culling as the primary capacity-control mechanism.
- [ ] The specification explicitly cites Clay element-count and text-measure-cache limits as the reason for pre-Clay virtualization.

#### REQ-014: Viewport Structure
The viewport MUST render as an outer vertically clipped container with a JS-managed child offset and spacer content representing skipped rows.

**Rationale**: Total content height must remain stable even while only a subset of items is materialized.

**Acceptance Criteria**:
- [ ] The rendered structure includes an outer clip container.
- [ ] The clip container applies a vertical child offset derived from JS-managed scroll state.
- [ ] The materialized content includes an above-window spacer and a below-window spacer.
- [ ] The sum of spacer heights plus materialized item heights equals the total content height.

#### REQ-015: Visible-Item Guarantee
The materialized window MUST include every item whose measured bounds intersect the viewport.

**Rationale**: Budget handling must not cause visible holes or missing content.

**Acceptance Criteria**:
- [ ] Any item intersecting the viewport is materialized.
- [ ] Overscan items MAY be omitted when budgets are tight.
- [ ] Visible items are never dropped solely to satisfy overscan or budget preferences.

#### REQ-016: Budget-Aware Overscan
The viewport SHOULD materialize overscan rows above and below the viewport, but it MUST treat overscan as subordinate to visible-item coverage and budget ceilings.

**Rationale**: Overscan improves UX but cannot take priority over correctness or capacity constraints.

**Acceptance Criteria**:
- [ ] The viewport accepts `overscanRows` with a default of `3`.
- [ ] The viewport accepts a budget structure that can constrain `estimatedElements` and `estimatedMeasuredWords`.
- [ ] When budget ceilings are reached, overscan is reduced before visible items are omitted.

#### REQ-017: Budget-Exceeded Reporting
If the visible range alone exceeds configured budget ceilings, the viewport MUST still materialize the visible items and MUST report that the budget was exceeded.

**Rationale**: v1 does not implement fidelity degradation; correctness takes priority over estimated budget compliance.

**Acceptance Criteria**:
- [ ] Visible items remain rendered when they exceed budgets.
- [ ] Viewport state includes `budgetExceeded: boolean`.
- [ ] `budgetExceeded` becomes `true` when visible items exceed configured ceilings.
- [ ] The implementation does not automatically simplify or degrade item rendering in this situation.

#### REQ-018: Measurement Caching
The viewport MUST cache item measurements by `key`, `version`, and width.

**Rationale**: Repeatedly remeasuring unchanged items would make scrolling and streaming unnecessarily expensive.

**Acceptance Criteria**:
- [ ] Re-rendering the same items at the same width and version reuses cached results.
- [ ] Width changes invalidate the relevant cached entries.
- [ ] Version changes invalidate the relevant cached entries.

### 2.5 Scroll and Anchor Requirements

#### REQ-019: Auto-Follow End Threshold
The viewport MUST support an `endThresholdRows` setting used to determine whether it is at the end of content.

**Rationale**: Chat-like auto-follow must tolerate small deltas rather than requiring exact equality with maximum scroll position.

**Acceptance Criteria**:
- [ ] The viewport accepts `endThresholdRows` with a default of `1`.
- [ ] Viewport state includes `atEnd: boolean`.
- [ ] `atEnd` is `true` when `maxScrollTop - scrollTop <= endThresholdRows`.

#### REQ-020: Bottom Anchor While Auto-Following
When auto-follow is enabled, content growth and remeasurement MUST preserve the bottom anchor.

**Rationale**: Streaming content should remain pinned to the latest output when the user is following the transcript.

**Acceptance Criteria**:
- [ ] Appending tail content while `autoFollow` is `true` keeps the viewport at end.
- [ ] Tail remeasurement while `autoFollow` is `true` keeps the viewport at end.
- [ ] Width changes while `autoFollow` is `true` keep the viewport at end.

#### REQ-021: Top Visible Anchor While Browsing History
When auto-follow is disabled, content growth, remeasurement, and width changes MUST preserve the first visible item's identity and intra-item offset.

**Rationale**: Users reading older content expect their reading position to remain stable during streaming updates.

**Acceptance Criteria**:
- [ ] The viewport records an anchor based on first visible item key plus intra-item offset.
- [ ] Tail append and tail rewrite do not change the first visible anchored item when it remains present.
- [ ] Width changes preserve that item's visual anchor as closely as measurement allows.

#### REQ-022: Controllable Auto-Follow
The viewport MUST expose imperative control over auto-follow and scrolling.

**Rationale**: Consumers need to explicitly enable/disable follow and implement a jump-to-latest affordance.

**Acceptance Criteria**:
- [ ] The viewport exposes a handle with at least `scrollTo(offset)`, `scrollBy(delta)`, `scrollToLatest()`, `setAutoFollow(value)`, and `getState()`.
- [ ] `scrollToLatest()` sets `autoFollow` to `true` and moves to end.
- [ ] `setAutoFollow(false)` leaves the current scroll position unchanged.

#### REQ-023: User Scroll Effects on Auto-Follow
User-initiated backward scrolling MUST disable auto-follow. User-initiated scrolling that reaches the end threshold MUST re-enable auto-follow.

**Rationale**: This matches expected chat-style behavior while keeping the mode externally understandable.

**Acceptance Criteria**:
- [ ] Wheel-up, ArrowUp, PageUp, and Home disable auto-follow.
- [ ] Reaching the end threshold by user scroll sets `autoFollow` to `true`.
- [ ] Viewport state changes are observable through the public state callback or handle.

#### REQ-024: Viewport State Reporting
The viewport MUST report state sufficient to drive external UI such as jump-to-latest indicators.

**Rationale**: Consumers need to know whether follow is active and whether the viewport is away from the end.

**Acceptance Criteria**:
- [ ] The public state includes at least `scrollTop`, `contentHeight`, `viewportHeight`, `atStart`, `atEnd`, `autoFollow`, `budgetExceeded`, `windowStartIndex`, and `windowEndIndex`.
- [ ] The viewport provides an `onStateChange(state)` callback or equivalent observer.
- [ ] A consumer can determine whether to show a jump-to-latest control using only public state.

#### REQ-025: Wheel Event Routing
`@tui/core` MUST route wheel events through the renderable event system.

**Rationale**: Scrollable viewports need wheel targeting that matches the existing bubbling event model.

**Acceptance Criteria**:
- [ ] `@tui/core` defines a `WheelEvent` class extending `TerminalEvent`.
- [ ] `Renderable` exposes an optional `onWheel` handler.
- [ ] Raw wheel input targets the deepest currently hovered renderable, if any.
- [ ] Wheel events bubble through ancestors unless propagation is stopped.

#### REQ-026: Viewport Default Wheel Handling
`VirtualViewport` MUST perform wheel scrolling when it receives a bubbled wheel event that has not had its default prevented.

**Rationale**: This preserves event composability while giving the viewport sensible default behavior.

**Acceptance Criteria**:
- [ ] The viewport accepts `wheelStepRows` with a default of `3`.
- [ ] Wheel up decreases `scrollTop` by `wheelStepRows` rows, clamped to `0`.
- [ ] Wheel down increases `scrollTop` by `wheelStepRows` rows, clamped to `maxScrollTop`.
- [ ] If a descendant prevents default on the wheel event, the viewport does not apply its default scroll behavior.

#### REQ-027: Keyboard Scroll Handling
`VirtualViewport` MUST support keyboard scrolling with PageUp, PageDown, Home, and End.

**Rationale**: Keyboard navigation is required for transcript and accessibility-style workflows.

**Acceptance Criteria**:
- [ ] The viewport handles PageUp by decreasing `scrollTop` by `max(viewportHeight - 1, 1)`.
- [ ] The viewport handles PageDown by increasing `scrollTop` by `max(viewportHeight - 1, 1)`.
- [ ] The viewport handles Home by setting `scrollTop` to `0` and disabling auto-follow.
- [ ] The viewport handles End by moving to `maxScrollTop` and enabling auto-follow.

#### REQ-028: Optional Arrow-Key Support
The viewport SHOULD support ArrowUp and ArrowDown scrolling when the consumer opts in.

**Rationale**: Some transcript UIs want fine-grained row scrolling, but others reserve arrow keys for nested interactions.

**Acceptance Criteria**:
- [ ] The viewport exposes `keyStepRows` with a default of `1`.
- [ ] Arrow-key handling is disabled unless explicitly enabled by the consumer.
- [ ] When enabled, ArrowUp and ArrowDown scroll by `keyStepRows` rows.

#### REQ-029: Focus Semantics for Virtualized Unmounts
The viewport MUST remain compatible with the existing JS-side focus model and MUST NOT implement logical offscreen focus preservation in v1.

**Rationale**: Hidden logical focus restoration is deferred work and would complicate the initial design.

**Acceptance Criteria**:
- [ ] Collapsing or virtualizing away a focused subtree may blur it under current JS behavior.
- [ ] The specification explicitly states that offscreen logical focus preservation is out of scope for v1.
- [ ] `VirtualViewport` does not keep hidden focused placeholders for unmounted content.

### 2.6 Transcript Consumer Requirements

#### REQ-030: Append Plus Tail Rewrite Streaming Model
The first transcript-oriented consumer MUST support append-only growth plus tail rewrite for unsettled streaming content.

**Rationale**: Unclosed code fences, incomplete math delimiters, and similar streaming constructs stabilize over time near the tail.

**Acceptance Criteria**:
- [ ] Earlier settled items may remain unchanged while new items are appended.
- [ ] Tail items may keep the same key while their `version` changes as rendering semantics settle.
- [ ] Tail rewrite does not require arbitrary edits to earlier settled content.

#### REQ-031: Collapsible Thinking Blocks
The first transcript-oriented consumer MUST support collapsible thinking blocks.

**Rationale**: The motivating use case explicitly requires collapse/expand behavior for reasoning-like content.

**Acceptance Criteria**:
- [ ] Thinking blocks default to expanded.
- [ ] Collapsing a thinking block changes its measured height.
- [ ] Expanding restores its rendered content.

#### REQ-032: Background Updates While Collapsed
Collapsed thinking blocks MUST continue receiving streamed updates and remeasurement in the background.

**Rationale**: Collapse is a presentation concern, not a suspension of transcript updates.

**Acceptance Criteria**:
- [ ] A collapsed thinking block can receive new streamed content.
- [ ] Its measurement cache invalidates when its `version` changes.
- [ ] Re-expanding reveals the updated content.

#### REQ-033: Viewport Layout Participation
The viewport MUST be usable inside normal Clay layout, including parent-driven `grow` sizing.

**Rationale**: Requiring fixed viewport dimensions would make the primitive much less reusable.

**Acceptance Criteria**:
- [ ] The viewport can discover its actual rendered height via geometry queries.
- [ ] The viewport uses completed-render geometry to update subsequent windowing decisions.
- [ ] The specification does not require callers to provide a fixed height.

#### REQ-034: TODO Tracking for Deferred Work
The implementation documentation and later test plan MUST track deferred topics as explicit TODO or future-work items.

**Rationale**: The approved design explicitly requires these deferrals to be recorded, not silently forgotten.

**Acceptance Criteria**:
- [ ] Deferred items include reverse direction, horizontal scrolling/virtualization, nested scroll regions, search, selection, advanced tables, automatic fidelity degradation, and richer focus preservation.
- [ ] The normative text distinguishes these items from in-scope requirements.
- [ ] The test plan can omit direct coverage for deferred items because they are out of scope.

## 3. Non-Functional Requirements

### 3.1 Determinism and Side Effects

#### REQ-035: Deterministic Measurement Helpers
The public measurement helpers MUST be deterministic and side-effect free for the same input arguments.

**Rationale**: Virtualization caches depend on deterministic measurement behavior.

**Acceptance Criteria**:
- [ ] Repeated calls with the same arguments produce the same result.
- [ ] The helpers do not mutate global scroll or renderer state.
- [ ] The helpers do not require a running render loop.

### 3.2 Capacity Safety

#### REQ-036: Materialization Bounded by Public Inputs
The viewport's Clay work MUST be bounded by public inputs such as measured content, overscan, and budgets, rather than by total transcript size.

**Rationale**: The main value of virtualization is preventing Clay work from scaling linearly with the entire transcript.

**Acceptance Criteria**:
- [ ] Increasing non-materialized history does not increase the emitted Clay ops for a stable viewport window.
- [ ] Increasing transcript history outside the materialized window does not increase the number of materialized items.
- [ ] Visible-range size, overscan, and configured budgets remain the primary determinants of materialization size.

## 4. Interfaces

The TypeScript shapes in this section are normative. Implementations MAY add fields, overloads, or convenience wrappers, but they MUST provide behavior equivalent to the following contracts.

### 4.1 `clayterm` Interfaces

```ts
export type WrapTextMode = "words" | "newlines" | "none";

export interface WrapTextOptions {
  mode?: WrapTextMode; // default: "words"
}

export interface WrappedLine {
  text: string;
  width: number;
}

export interface TextMeasureApi {
  measureCellWidth(text: string): number;
  wrapText(text: string, width: number, options?: WrapTextOptions): WrappedLine[];
  measureWrappedHeight(text: string, width: number, options?: WrapTextOptions): number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Term {
  render(ops: Op[], options?: RenderOptions): RenderResult;
  getElementBounds(id: string): ElementBounds | undefined;
}
```

Normative notes:
- `measureCellWidth` MUST use Clay-compatible terminal-cell width rules.
- `wrapText` MUST return `WrappedLine.width` values that are equal to `measureCellWidth(line.text)`.
- `getElementBounds()` MUST read from the last completed render only.

### 4.2 `@tui/core` Interfaces

```ts
export class WheelEvent extends TerminalEvent {
  readonly x: number;
  readonly y: number;
  readonly direction: "up" | "down";
  readonly modifiers: MouseModifiers;
}

export abstract class Renderable {
  onWheel?: (event: WheelEvent) => void;
}

export class Renderer {
  getElementBounds(id: string): ElementBounds | undefined;
}
```

Normative notes:
- Wheel events MUST bubble through the renderable tree.
- `preventDefault()` on a bubbled wheel event MUST suppress default viewport wheel handling.
- `Renderer.getElementBounds()` MUST preserve `undefined` semantics for unknown IDs.

### 4.3 `@tui/solid-bindings` Interfaces

```ts
export interface VirtualItemMeasurement {
  height: number;
  estimatedElements?: number;
  estimatedMeasuredWords?: number;
}

export interface VirtualItem {
  key: string;
  version: string | number;
  measure(width: number, measure: TextMeasureApi): VirtualItemMeasurement;
  render(): JSX.Element;
}

export interface VirtualViewportBudget {
  maxEstimatedElements?: number;
  maxEstimatedMeasuredWords?: number;
}

export interface VirtualViewportState {
  scrollTop: number;
  contentHeight: number;
  viewportHeight: number;
  atStart: boolean;
  atEnd: boolean;
  autoFollow: boolean;
  budgetExceeded: boolean;
  windowStartIndex: number;
  windowEndIndex: number; // exclusive
}

export interface VirtualViewportHandle {
  scrollTo(offset: number): void;
  scrollBy(delta: number): void;
  scrollToLatest(): void;
  setAutoFollow(value: boolean): void;
  getState(): VirtualViewportState;
}

export interface VirtualViewportProps {
  id?: string;
  items: readonly VirtualItem[];
  overscanRows?: number;      // default: 3
  endThresholdRows?: number;  // default: 1
  wheelStepRows?: number;     // default: 3
  keyStepRows?: number;       // default: 1
  enableArrowKeys?: boolean;  // default: false
  budget?: VirtualViewportBudget;
  onStateChange?: (state: VirtualViewportState) => void;
  ref?: (handle: VirtualViewportHandle | undefined) => void;
}

export function VirtualViewport(props: VirtualViewportProps): JSX.Element;
```

Normative notes:
- If `id` is omitted, the component MUST create and retain a stable internal viewport ID.
- The materialized window MUST be contiguous by item index.
- `VirtualViewport` MUST be the unit that applies clip props and spacer rendering.

## 5. Error Handling

The following error behavior is normative:
- Invalid width input for wrapping or wrapped-height measurement MUST throw `RangeError`.
- Duplicate item keys in a viewport instance MUST produce a developer-visible error.
- Non-finite or negative measurement outputs MUST produce a developer-visible error.
- Unknown geometry IDs MUST return `undefined`, not throw.
- Negative or non-finite viewport configuration values (`overscanRows`, `wheelStepRows`, `keyStepRows`, `endThresholdRows`, budget ceilings) MUST throw `RangeError` during configuration.

Recovery behavior:
- When a duplicate key or invalid measurement result is encountered, the viewport MAY refuse to render the affected frame, but it MUST NOT silently continue with corrupted scroll math.
- When budgets are exceeded by visible items, the viewport MUST prefer correctness and set `budgetExceeded = true` rather than dropping visible content.

## 6. Security Considerations

This feature does not introduce authentication or authorization semantics. The primary security-relevant concerns are correctness, resource usage, and handling of untrusted content.

Normative security considerations:
- Public measurement helpers MUST treat input as inert text and MUST NOT execute embedded content.
- Geometry queries MUST expose only the current process's UI geometry and MUST NOT perform external I/O.
- Virtualization MUST constrain Clay work using public budgets and materialized windows so that unbounded transcript history does not force proportional Clay layout work.
- Consumers rendering untrusted markdown, math, or syntax-highlighted content SHOULD sanitize or bound any upstream parser output before mapping it to `VirtualItem`s.

## 7. Migration / Compatibility

This specification is additive with respect to the current stack.

Compatibility rules:
- Existing `clayterm.createTerm(...).render(...)` behavior MUST remain valid; geometry query is additive.
- Existing `@tui/core` pointer and keyboard routing MUST remain valid; wheel support is additive.
- Existing non-virtualized `@tui/solid-bindings` code MUST continue to work unchanged.
- Clip-prop exposure and `VirtualViewport` are additive APIs.

Deferred compatibility topics, intentionally out of scope for v1:
- reverse-flow / bottom-up transcript layout
- horizontal virtualization and code-pane scrolling
- nested independent scroll regions inside virtualized content
- text selection and copy semantics
- transcript search/find
- advanced table layout guarantees
- automatic fidelity degradation for expensive items
- richer logical focus preservation across virtualization

## References
- Design Document: [.pi/specs/design-virtual-scroll-text-measure.md](.pi/specs/design-virtual-scroll-text-measure.md)
- RFC 2119: https://www.rfc-editor.org/rfc/rfc2119
- Clay README: `packages/clayterm/clay/README.md`
- Clay Header: `packages/clayterm/clay/clay.h`
