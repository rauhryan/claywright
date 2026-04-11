# Design: Virtual Scroll and Text Measurement

## Status
Planner handoff draft

## Overview
Design generic, content-agnostic vertical virtualization and text measurement primitives for Clay/solid terminal UIs, with an LLM transcript viewport as the first consumer. The system must support streaming tail updates, variable-height rich blocks such as markdown, syntax-highlighted code, math, and collapsible thinking sections, while respecting Clay WASM element and text-measure cache limits by materializing only a budgeted viewport window.

The core design is a JS-owned virtual viewport that manages scroll state, measurement, windowing, and anchor preservation before content is sent to Clay. Clay remains the layout and render engine for the visible window only. The first concrete consumer is a streaming transcript made of stable logical blocks that may be appended or progressively rewritten near the tail while markdown structures settle.

## Goals
- Provide a generic vertical virtualization primitive for any ordered sequence of width-dependent, variable-height items.
- Keep the virtualization layer content-agnostic: it must not know about markdown, code fences, math, or thinking blocks.
- Support a transcript-style consumer that streams LLM output, progressively enhances unsettled tail content, and treats settled content as immutable.
- Keep Clay usage within practical arena, element-count, and text-measure-cache limits by materializing only a bounded viewport window plus overscan.
- Expose public low-level terminal text measurement helpers for width, wrapping, and wrapped height.
- Support viewport boxes that participate in normal Clay layout rather than requiring fixed dimensions.
- Support wheel and keyboard scrolling, controllable auto-follow, jump-to-latest UX, and collapsible blocks.

## Non-Goals
- Automatic virtualization of arbitrary JSX trees or arbitrary nested render trees.
- Line-level virtualization in v1.
- Horizontal virtualization or horizontally scrollable code panes in v1.
- Reverse-flow / bottom-up layout in v1.
- Automatic fidelity degradation of expensive items in v1 (for example, automatically dropping syntax spans to stay within budget).
- Text selection, mouse-copy semantics, or search/find-in-transcript in v1.
- Advanced markdown table support with special layout guarantees in v1.
- Nested independent scroll regions inside transcript blocks in v1.

These non-goals should be tracked as explicit TODO/future-work items in the later specification.

## Requirements
- **R1. Generic ordered-item model.** The virtual scroll core MUST operate on a one-dimensional ordered sequence of items and MUST NOT encode markdown- or transcript-specific behavior.
- **R2. Explicit virtualization boundary.** The unit of virtualization MUST be an explicit item/block abstraction, not arbitrary child JSX or line-level fragments.
- **R3. Pre-Clay virtualization.** The system MUST decide which items to materialize in JS before building Clay ops; it MUST NOT rely on Clay visibility culling alone to stay within capacity.
- **R4. Scroll viewport structure.** The rendered viewport MUST use an outer clipped container plus JS-managed child offset and spacer elements so that total scroll height can be preserved while only a subset of items is materialized.
- **R5. Width-dependent measurement.** Items MUST support width-dependent measurement because markdown wrapping, code wrapping, math rendering, and collapse state all affect final height.
- **R6. Budget-aware windowing.** Window selection MUST consider both viewport/overscan horizon and budget ceilings that approximate Clay costs, especially estimated element count and estimated measured-text cost.
- **R7. Stable identity.** Each item MUST have a stable key that survives tail rewrites and progressive enhancement, even when its rendered shape or measured height changes.
- **R8. Streaming update model.** The first consumer MUST support append-only growth plus tail rewrites while markdown or math syntax is unsettled; settled earlier items SHOULD be treated as immutable.
- **R9. Anchor preservation.** When auto-follow is enabled, the viewport MUST preserve a bottom anchor. When auto-follow is disabled, it MUST preserve the first visible item plus intra-item offset across content growth, remeasurement, and width changes.
- **R10. Controllable auto-follow.** Auto-follow MUST be externally controllable and MUST turn off when the user scrolls away from the bottom. The API MUST expose enough state to drive a jump-to-latest affordance.
- **R11. Input support.** The system MUST support wheel scrolling and keyboard scrolling via PageUp, PageDown, Home, and End. It SHOULD also support arrow-based scrolling if the consumer opts in.
- **R12. Focus compatibility.** The design MUST work with the existing JS-side focus model. If a focused subtree is unmounted because it was virtualized away or collapsed, current JS focus behavior MAY blur it; v1 does not need logical offscreen focus preservation.
- **R13. Collapsible items.** The first consumer MUST support collapsible/expandable blocks. Thinking blocks MUST default to expanded and MUST continue receiving streamed updates and remeasurement while collapsed.
- **R14. Public text measurement API.** The platform MUST expose public low-level helpers for cell width, wrapping, and wrapped height that are suitable for virtualization and block measurement.
- **R15. Layout participation.** The viewport MUST be able to live inside normal Clay layout (for example, inside grow/flex boxes) and therefore MUST have access to its actual rendered bounds.
- **R16. Spec TODO tracking.** The later normative spec MUST explicitly note deferred topics such as reverse direction, horizontal scrolling, nested scroll regions, richer focus preservation, and budget-driven fidelity fallback.

## Design Decisions

### Decision 1: Virtualization happens in JS before Clay
- **Context**: Clay already supports clipping and visibility culling, but the transcript use case is constrained by Clay arena memory, `maxElementCount`, and text-measure-cache limits. Sending the entire transcript to Clay and letting offscreen content be culled still pays layout/measurement cost for the whole tree.
- **Options considered**:
  1. **Full transcript in Clay, rely on built-in culling** - Simple, but still consumes layout element and text-measure capacity for offscreen content.
  2. **Clay-managed scroll container with internal scroll offsets** - Useful for simple scroll boxes, but still requires the full tree to be materialized.
  3. **JS-owned pre-Clay virtualization** - More logic in JS, but bounds Clay work to the currently materialized window.
- **Choice**: Option 3.
- **Rationale**: This is the only option that directly addresses the actual bottleneck: Clay element and measurement capacity, not just render-command output. The viewport must decide what to materialize before Clay sees it.

### Decision 2: Content-agnostic, sequence-constrained core
- **Context**: The user wants virtual scroll to be “everything agnostic,” but arbitrary-JSX virtualization is too open-ended for reliable measurement, budgeting, and stable anchor behavior.
- **Options considered**:
  1. **Transcript-specific component only** - Fastest for the first use case, but not reusable.
  2. **Automatic virtualization of arbitrary JSX children** - Attractive API, but difficult to measure, budget, and reason about.
  3. **Generic ordered-item protocol** - Content-agnostic over a linear sequence, while requiring explicit item measurement/render contracts.
- **Choice**: Option 3.
- **Rationale**: “Everything agnostic” is defined here as agnostic to content semantics, not agnostic to all possible tree shapes. The core knows about a vertical sequence of items with stable keys, size estimates, and render functions. Transcript/markdown remains an adapter on top.

### Decision 3: Use an outer clipped viewport with top/bottom spacers
- **Context**: The visible window must preserve overall scroll height even when only part of the content is materialized.
- **Options considered**:
  1. **Render only visible items, no spacers** - Breaks scroll math because total content height disappears.
  2. **Render all items but hide offscreen ones** - Still blows the Clay budget.
  3. **Outer clip container + manual `childOffset` + spacer elements** - Preserves scroll height while minimizing materialized content.
- **Choice**: Option 3.
- **Rationale**: This is the standard virtualized-list pattern adapted to Clay. The outer viewport clips; the top spacer represents skipped content above; the bottom spacer represents skipped content below; only the middle window is materialized.

### Decision 4: Keep scroll state in JS and use external scroll offsets
- **Context**: `clayterm` has low-level clip support today, but the current native wrapper does not expose higher-level scroll-container state, and the transcript needs virtualization-aware policies such as auto-follow and anchor preservation.
- **Options considered**:
  1. **Use Clay’s internal scroll container state** - Simpler for fixed content, but not virtualization-aware.
  2. **Keep scroll state in JS and drive `clip.childOffset` manually** - More app-side logic, but full control.
- **Choice**: Option 2.
- **Rationale**: JS already owns transcript state and virtualization. Keeping `scrollTop`, auto-follow, anchors, and jump-to-latest state in JS keeps the policy in one place and avoids coupling to Clay’s internal scrolling model.

### Decision 5: Windowing is constrained by horizon and budget
- **Context**: A viewport-sized overscan alone is not enough. A syntax-highlighted code block can be short in rows but expensive in Clay elements and text runs.
- **Options considered**:
  1. **Viewport + overscan only** - Easy, but can still exceed Clay limits.
  2. **Fixed item count only** - Ignores variable-height and variable-cost behavior.
  3. **Viewport/overscan horizon plus estimated budget ceilings** - More bookkeeping, but aligned with real constraints.
- **Choice**: Option 3.
- **Rationale**: The window selector should include items until it satisfies the visibility horizon but stop before exceeding configured cost ceilings. The first budgets should approximate estimated Clay element count and measured-text cost.

### Decision 6: Item protocol includes stable key, version, measurement, cost, and render
- **Context**: Tail items may progressively enhance from plain text to code fences or math blocks while preserving scroll anchors and cache hits.
- **Options considered**:
  1. **Only key + render** - Too little information for measurement and budget-aware windowing.
  2. **Separate ad hoc measurement pipeline per consumer** - Flexible, but weakly standardized.
  3. **Formal item protocol** - Slightly more API surface, but clear contracts.
- **Choice**: Option 3.
- **Rationale**: The core needs stable identity, versioning for cache invalidation, width-dependent measurement, cost estimation, and a render hook. This creates a reusable interface for transcript blocks and future consumers.

### Decision 7: Transcript updates are append + tail rewrite
- **Context**: Streaming markdown and math commonly change meaning near the tail: an unfinished fence can become a code block, and inline syntax can become math once delimiters close.
- **Options considered**:
  1. **Allow arbitrary edits anywhere** - Max flexibility, but more complex identity and anchoring.
  2. **Append-only with no rewrites** - Too restrictive for real streaming markdown.
  3. **Append plus tail rewrite/progressive enhancement** - Matches transcript reality without opening the full arbitrary-edit problem.
- **Choice**: Option 3.
- **Rationale**: This captures the expected update shape while preserving a simpler caching and anchoring model. Earlier settled blocks can be treated as stable.

### Decision 8: Anchor semantics mirror chat-style behavior
- **Context**: Streaming content and width changes can change block heights dramatically. The viewport needs deterministic behavior that feels like chat UIs.
- **Options considered**:
  1. **Always preserve absolute `scrollTop`** - Causes visible jumps during reflow.
  2. **Always preserve bottom** - Good for auto-follow, bad when reading older content.
  3. **Bottom anchor while following; top-visible-item anchor while reading history** - More state, but expected UX.
- **Choice**: Option 3.
- **Rationale**: This matches chat-style expectations. When following live output, the bottom matters. When reading older content, the user expects the same block and intra-block reading position to stay put.

### Decision 9: Public text measurement lives at the low level and is Clay-compatible
- **Context**: Virtualization needs measurement outside render-time. The current codebase measures text inside Clay via a terminal-cell `wcwidth` callback, but there is no public measurement API for consumers.
- **Options considered**:
  1. **Keep measurement internal** - Blocks generic virtualization use cases and forces duplicate logic.
  2. **Expose WASM-only measurement helpers** - Exact, but awkward and potentially expensive for hot-path repeated measurement.
  3. **Expose public low-level helpers in `clayterm` that match Clay terminal-cell semantics and are validated against Clay output** - Slightly more implementation work, but ergonomic and fast.
- **Choice**: Option 3.
- **Rationale**: Consumers need a cheap API they can call frequently. The helpers should model the same cell-width rules and Clay-compatible wrapping behavior used by the renderer, and tests can keep them aligned.

### Decision 10: Viewport geometry is queried from Clay after render
- **Context**: The viewport should work inside normal Clay layout, including parent-driven width/height. The current stack does not expose per-element bounds even though underlying Clay supports `Clay_GetElementData`.
- **Options considered**:
  1. **Require fixed viewport sizes** - Simpler, but too limiting.
  2. **Infer viewport size manually from app props** - Fragile under parent layout.
  3. **Expose element bounds query from `clayterm`/renderer and use last-rendered geometry to drive next-frame virtualization** - Best layout fidelity.
- **Choice**: Option 3.
- **Rationale**: This lets the viewport live naturally in existing layouts. A previous-frame geometry read is acceptable; the viewport can render conservatively on first mount and schedule a correcting frame once bounds are known.

### Decision 11: Input integration uses bubbling wheel and keyboard events
- **Context**: The input parser already recognizes wheel events, but `@tui/core` currently only routes mouse move/down/up, click, keyboard, and paste. A scrollable viewport needs wheel targeting and keyboard scrolling even when focus is inside descendant content.
- **Options considered**:
  1. **Special-case scrolling outside the event system** - Fast to ship, but inconsistent.
  2. **Extend the existing event model with wheel support and let key events bubble to the viewport** - Fits current architecture.
- **Choice**: Option 2.
- **Rationale**: Wheel should target the hovered viewport and bubble like other pointer-derived events. PageUp/PageDown/Home/End can bubble from focused descendants to the viewport using the existing renderable tree event model.

### Decision 12: Focus remains JS-side; no logical offscreen focus preservation in v1
- **Context**: The current focus model is already JS-managed in `@tui/core`. Preserving logical focus across virtualization would add hidden state and complexity.
- **Options considered**:
  1. **Preserve logical focus for unmounted items** - Richer UX, but significantly more complexity.
  2. **Let existing focus lifecycle apply** - Simpler and matches current architecture.
- **Choice**: Option 2.
- **Rationale**: If virtualization or collapse unmounts a focused subtree, current JS behavior may blur it. If a collapse toggle stays mounted, it naturally keeps focus. Better offscreen focus restoration can be future work.

### Decision 13: No automatic fidelity degradation in v1
- **Context**: Extremely expensive blocks may eventually need graceful fallback behavior, but the desired policy is not yet clear.
- **Options considered**:
  1. **Introduce automatic downgrade policies now** - Powerful, but underspecified.
  2. **Leave expensive items intact and only constrain the materialized window** - Simpler and easier to reason about.
- **Choice**: Option 2.
- **Rationale**: The open product question is not “whether to budget,” but “how to degrade fidelity when a single block is too expensive.” v1 should close the design by deferring degradation policy to future work while still limiting the window size itself.

## Constraints
- Clay uses a fixed arena and hard internal capacities. Default upstream values are approximately `maxElementCount = 8192` and `maxMeasureTextCacheWordCount = 16384`, and larger values require recomputing `Clay_MinMemorySize()` and reinitializing the arena.
- Clay visibility culling is enabled by default, but it only culls render commands for offscreen elements; it does not eliminate the layout/measurement cost of sending a full offscreen tree into Clay.
- `clayterm` currently already supports low-level `clip` props in ops packing, but higher-level Solid bindings do not expose clip props today.
- `clayterm` currently exposes pointer-over IDs but does not expose generic element geometry queries through the JS API.
- The native wrapper currently wires `queryScrollOffsetFunction` to zero, so built-in Clay scroll-offset querying is not usable as an application-level source of truth.
- The current JS focus model lives in `@tui/core`, so any design that relies on browser-like DOM focus restoration would require additional focus infrastructure.
- Measurement must remain cheap; virtualization cannot afford to instantiate full Clay layouts solely to estimate heights for large numbers of offscreen blocks.

## Dependencies
- **Internal: `packages/clayterm`**
  - expose public text measurement helpers
  - expose per-element geometry query after render
  - continue supporting clip + child offset ops
- **Internal: `packages/core`**
  - add wheel event plumbing
  - integrate scrollable viewport behavior with existing focus and keyboard routing
- **Internal: `packages/solid-bindings`**
  - expose clip-related props and a first-class virtual viewport component/hook
  - support item materialization and spacer rendering in the OpNode/renderable pipeline
- **Internal: test harness / ghostty-vt**
  - blackbox validation of scrolling, streaming, reflow anchoring, and collapse behavior
- **External/upstream: Clay behavior**
  - stable element IDs, clip behavior, `Clay_GetElementData`, text wrapping semantics, and arena limits shape the design

## Open Questions
None at the planner stage. Questions intentionally deferred from v1 are recorded as non-goals / future work rather than unresolved design blockers.

## Research Notes
- `packages/clayterm/ops.ts` already supports `clip` props with `horizontal`, `vertical`, and `childOffset`, which is enough to express a JS-managed viewport at the op level.
- `packages/solid-bindings/src/opnode/ElementOpNode.ts` and `packages/solid-bindings/src/renderable-to-ops.ts` currently map layout, border, bg, corner radius, and floating props, but do not map clip props, so Solid does not yet expose scroll containers cleanly.
- `packages/clayterm/src/clayterm.c` hashes IDs with a stable seed, decodes clip props, and uses `Clay_MinMemorySize()` during initialization. Its `measure()` callback computes terminal-cell width via UTF-8 decode + `wcwidth` and returns height `1`, which aligns with a terminal-cell measurement model.
- `packages/clayterm/clay/clay.h` shows upstream defaults around `8192` max elements and `16384` measured words, and documents that increasing them requires recalculating arena size and reinitializing Clay.
- `packages/clayterm/clay/README.md` documents that visibility culling only limits render commands to visible elements; this is useful for output generation but insufficient for transcript-scale virtualization because layout elements still exist.
- `packages/clayterm/clay/README.md` and `clay.h` expose `Clay_GetElementData`, which means element geometry can be surfaced in `clayterm` without inventing a new layout primitive.
- `packages/clayterm/term-native.ts` wires `queryScrollOffsetFunction` to zero and does not expose element geometry today, confirming that viewport geometry and JS-owned scroll state need explicit work.
- `packages/core/src/Renderer.ts` maintains focus, hover, and pressed state in JS, and currently does not route wheel events. This supports the design decision that focus remains JS-owned and that wheel support must be added at the core layer.
- `packages/clayterm/input.ts` already parses `wheel` events with position data, so the missing piece is event plumbing, not low-level parsing.
- Clay’s text wrapping logic is upstream and deterministic enough that `clayterm` can expose compatible public measurement helpers and validate them against rendered Clay behavior in tests.

## Writer Handoff Prompt
Write the full design memo for **Virtual Scroll and Text Measurement** using this planner-approved brief.

The memo should:
- treat the design as resolved with no open overall-design questions
- keep the core generic over an ordered vertical item sequence
- make the LLM transcript viewport the first consumer, not the only consumer
- explain why virtualization must happen in JS before Clay, using Clay arena / element-count / text-measure-cache constraints and the fact that visibility culling only affects render commands
- define the viewport structure as outer clip container + JS scroll state + top/bottom spacers + materialized middle window
- define a concrete item protocol with stable key, version, width-dependent measure, cost estimate, and render hook
- describe append + tail rewrite semantics for streaming markdown, unfinished code fences, and progressive math enhancement
- define anchor preservation rules: bottom anchor while auto-following, top-visible-item + intra-item offset while reading history
- state that auto-follow is controllable, scrolling away disables it, and the API should support a jump-to-latest affordance
- specify support for wheel and PageUp/PageDown/Home/End scrolling
- specify that thinking blocks are collapsible, default expanded, and keep updating while collapsed
- specify a public low-level text measurement API (`measureCellWidth`, `wrapText`, `measureWrappedHeight` or equivalent)
- specify that the viewport must work inside normal Clay layout and therefore needs actual element-geometry access from `clayterm`
- state that focus remains JS-side and v1 does not preserve logical focus for virtualized-away content
- explicitly record deferred items as TODO/future work: reverse direction, horizontal scrolling/virtualization, nested independent scroll regions, search, selection, advanced tables, automatic fidelity degradation, richer focus preservation

Also include clear implementation-layer responsibilities across `packages/clayterm`, `packages/core`, and `packages/solid-bindings`, plus blackbox-test implications for streaming, anchoring, and collapse behavior.
