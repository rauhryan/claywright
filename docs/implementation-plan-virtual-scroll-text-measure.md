# Implementation Plan: Virtual Scroll and Text Measurement

This document turns the approved design, spec, and test plan for virtual scroll and text measurement into an execution plan for the monorepo.

## Source Documents
- Design: `.pi/specs/design-virtual-scroll-text-measure.md`
- Spec: `.pi/specs/spec-virtual-scroll-text-measure.md`
- Test plan: `.pi/specs/test-plan-virtual-scroll-text-measure.md`

## Goals
Ship, in order:
1. public text measurement helpers in `clayterm`
2. completed-render element geometry queries in `clayterm` and `@tui/core`
3. wheel-event routing in `@tui/core`
4. clip-prop exposure in `@tui/solid-bindings`
5. a generic `VirtualViewport` in `@tui/solid-bindings`
6. blackbox coverage for scrolling, anchoring, streaming, and collapse behavior

---

## Phase 0: Scaffolding and package boundaries

### Goal
Create the file layout and public API seams before implementing behavior.

### Tasks
- Add a new implementation area in `packages/solid-bindings/src/virtual-scroll/`:
  - `types.ts`
  - `measurement-cache.ts`
  - `windowing.ts`
  - `anchor.ts`
  - `VirtualViewport.tsx`
- Add a new `packages/clayterm/measure.ts` for public measurement helpers.
- Add any low-level geometry helper file if needed in `packages/clayterm/term.ts` / `term-native.ts`.
- Re-export new public APIs from:
  - `packages/clayterm/mod.ts`
  - `packages/core/src/index.ts`
  - `packages/solid-bindings/src/index.ts`

### Deliverable
The repo builds with placeholder exports and no behavior changes yet.

### Verification
- Type-check touched files cleanly
- Public exports compile

---

## Phase 1: `clayterm` public text measurement helpers

### Goal
Implement the spec-level helpers:
- `measureCellWidth(text)`
- `wrapText(text, width, options?)`
- `measureWrappedHeight(text, width, options?)`

### Primary Files
- `packages/clayterm/measure.ts` (new)
- `packages/clayterm/mod.ts`
- `packages/clayterm/package.json` if exports need adjustment
- tests in `packages/clayterm/test/`

### Tasks
- Implement cell width using the same terminal-cell semantics used by Clay text measurement.
- Implement wrap modes:
  - `words`
  - `newlines`
  - `none`
- Implement width validation and `RangeError` behavior.
- Ensure `measureWrappedHeight(...) === wrapText(...).length`.
- Keep helpers pure and side-effect free.

### Notes
Prefer implementing this as a pure JS/TS helper, then validating against Clay-compatible behavior in tests, instead of requiring render-time WASM calls on the hot path.

### Tests to Add
- width of ASCII, combining, zero-width, control characters
- wrap mode behavior
- zero-width and empty-string cases
- invalid width cases
- determinism tests

### Deliverable
`clayterm` exports the public measurement API required by REQ-001 through REQ-004 and REQ-035.

---

## Phase 2: `clayterm` completed-render geometry queries

### Goal
Expose previous completed-render bounds by stable element ID.

### Primary Files
- `packages/clayterm/src/clayterm.c`
- `packages/clayterm/src/clayterm.h`
- `packages/clayterm/term-native.ts`
- `packages/clayterm/term.ts`
- tests in `packages/clayterm/test/`

### Tasks
- Add C exports that query `Clay_GetElementData(...)` for a string ID from the last completed render.
- Decide the narrowest native surface needed, for example:
  - string-id lookup by UTF-8 input buffer, returning found flag + x/y/width/height
- Bridge those exports in `term-native.ts`.
- Expose `getElementBounds(id: string): ElementBounds | undefined` on the `Term` interface.
- Preserve spec freshness semantics:
  - `undefined` before first completed render
  - `undefined` for unknown IDs
  - updated values after subsequent renders

### Design Constraint
Do not expose partially-computed geometry. Only expose geometry for the last completed render.

### Tests to Add
- bounds unavailable before first render
- bounds available after render
- bounds update after layout change
- unknown ID returns `undefined`

### Deliverable
`clayterm.createTerm()` returns a `Term` that supports `getElementBounds()`.

---

## Phase 3: `@tui/core` geometry delegation and wheel routing

### Goal
Expose geometry through `Renderer` and add wheel events to the existing bubbling event model.

### Primary Files
- `packages/core/src/events.ts`
- `packages/core/src/Renderable.ts`
- `packages/core/src/Renderer.ts`
- `packages/core/src/index.ts`
- tests in `packages/core/test/`

### Tasks
- Add `WheelEvent` class extending `TerminalEvent`.
- Add `onWheel?: (event: WheelEvent) => void` to `Renderable`.
- Update event dispatch logic in `Renderable.processEvent(...)`.
- Extend `Renderer.handleInput(...)` / input processing to route raw `wheel` input events.
- Target wheel events at the deepest hovered renderable.
- Preserve bubbling and `preventDefault()` semantics.
- Add `Renderer.getElementBounds(id)` delegating to the underlying term.

### Notes
This should integrate with the existing event model, not special-case wheel scrolling outside the tree.

### Tests to Add
- wheel event dispatch to hovered target
- wheel bubbling to ancestors
- `preventDefault()` suppressing default viewport scroll behavior downstream
- geometry delegation on `Renderer`

### Deliverable
`@tui/core` supports REQ-007, REQ-025, and the event-side prerequisites for REQ-026 through REQ-028.

---

## Phase 4: `@tui/solid-bindings` clip props and low-level integration

### Goal
Expose clip props in Solid bindings so a viewport can be expressed in ops.

### Primary Files
- `packages/solid-bindings/src/jsx-runtime.ts`
- `packages/solid-bindings/src/opnode/ElementOpNode.ts`
- `packages/solid-bindings/src/renderable-to-ops.ts`
- maybe `packages/solid-bindings/src/ElementRenderable.ts`
- tests in `packages/solid-bindings/test/`

### Tasks
- Add `clip` to `JSX.IntrinsicElements.box`.
- Map `clip` through both op emission paths:
  - OpNode path
  - renderable fallback path
- Confirm `childOffset` is emitted correctly.
- Keep this additive and non-breaking.

### Tests to Add
- clip props reach emitted ops
- `childOffset` changes propagate to rendered output
- no regression in existing box rendering

### Deliverable
Solid bindings can express a clipped container with manual child offset.

---

## Phase 5: Virtual scroll math core

### Goal
Build the reusable non-visual core for virtualization.

### Primary Files
- `packages/solid-bindings/src/virtual-scroll/types.ts`
- `packages/solid-bindings/src/virtual-scroll/measurement-cache.ts`
- `packages/solid-bindings/src/virtual-scroll/windowing.ts`
- `packages/solid-bindings/src/virtual-scroll/anchor.ts`
- unit tests alongside or under `packages/solid-bindings/test/`

### Tasks
- Define the public types:
  - `VirtualItemMeasurement`
  - `VirtualItem`
  - `VirtualViewportBudget`
  - `VirtualViewportState`
  - `VirtualViewportHandle`
  - `VirtualViewportProps`
- Implement measurement caching keyed by:
  - `key`
  - `version`
  - `width`
- Implement total content height calculation.
- Implement contiguous materialized window selection.
- Implement visible-item guarantee.
- Implement overscan handling.
- Implement budget handling:
  - visible items always win
  - overscan shrinks first
  - `budgetExceeded` flips true when visible content alone exceeds budget
- Implement anchor logic:
  - bottom anchor while following
  - top-visible-item + intra-item offset while browsing history

### Tests to Add
- cache reuse and invalidation
- contiguous windowing
- overscan reduction under budget pressure
- visible-item guarantee
- `budgetExceeded` semantics
- anchor preservation calculations

### Deliverable
A pure virtualization engine usable by a visual viewport component.

---

## Phase 6: `VirtualViewport` component

### Goal
Build the public Solid component and imperative handle.

### Primary Files
- `packages/solid-bindings/src/virtual-scroll/VirtualViewport.tsx`
- `packages/solid-bindings/src/index.ts`
- maybe helper files in `packages/solid-bindings/src/virtual-scroll/`
- tests in `packages/solid-bindings/test/`

### Tasks
- Render the viewport as:
  - outer clipped box
  - top spacer
  - materialized items
  - bottom spacer
- Maintain JS-owned scroll state.
- Read actual viewport geometry using `Renderer.getElementBounds(...)` from the previous completed render.
- Expose the imperative handle:
  - `scrollTo(offset)`
  - `scrollBy(delta)`
  - `scrollToLatest()`
  - `setAutoFollow(value)`
  - `getState()`
- Emit `onStateChange(...)` updates.
- Implement default wheel handling.
- Implement keyboard handling:
  - PageUp
  - PageDown
  - Home
  - End
  - optional ArrowUp / ArrowDown
- Clamp all public scrolling operations to valid range.
- Validate public numeric config and throw `RangeError` for invalid values.
- Enforce duplicate-key and invalid-measurement errors.

### Tests to Add
- imperative handle behavior
- state callback behavior
- clamp behavior
- invalid config errors
- duplicate-key errors
- invalid measurement errors
- participation in parent `grow()` layout using previous-frame geometry

### Deliverable
A working generic `VirtualViewport` that satisfies the core spec.

---

## Phase 7: Transcript-oriented consumer fixtures

### Goal
Prove the first consumer model: append + tail rewrite, collapse/expand, and auto-follow.

### Primary Files
- fixture files under `packages/solid-bindings/test/fixtures/`
- blackbox tests under `packages/solid-bindings/test/`
- optional example/demo under `packages/clayterm-examples` or `packages/solid-bindings`

### Tasks
- Create a transcript fixture with:
  - settled history
  - streaming unsettled tail
  - unclosed code fence that later closes
  - math-ish progressive enhancement case
  - thinking block with collapse toggle
- Keep keys stable across tail rewrite while versions change.
- Add visible state markers for blackbox assertions:
  - `autoFollow`
  - `atEnd`
  - window range
  - collapse state
  - maybe budgetExceeded

### Tests to Add
- append while auto-following preserves bottom anchor
- scrolling up disables auto-follow
- returning to bottom re-enables auto-follow
- history browsing preserves top anchor across append/reflow/resize
- collapse reduces height
- collapsed block continues updating and reveals new content when expanded
- focusable descendant blur-on-unmount behavior

### Deliverable
Blackbox fixtures that directly exercise the motivating LLM transcript use case.

---

## Phase 8: Bounded-materialization and regression hardening

### Goal
Make sure the implementation actually protects Clay work as history grows.

### Primary Files
- `packages/solid-bindings/test/`
- `packages/clayterm/test/`
- any instrumentation helpers needed for debug assertions

### Tasks
- Add tests with thousands of virtual items.
- Verify emitted ops and/or visible materialized range do not scale with hidden history.
- Add budget-stress fixtures with expensive items.
- Verify `budgetExceeded` signaling when visible content alone is expensive.
- Verify no automatic fidelity degradation occurs in v1.

### Deliverable
Regression coverage that proves virtualization is pre-Clay and bounded.

---

## Phase 9: Documentation and deferred-work tracking

### Goal
Expose the new public APIs and explicitly record deferred features.

### Primary Files
- `packages/clayterm/README.md`
- `packages/solid-bindings/README.md`
- maybe package-local AGENTS or docs if needed

### Tasks
- Document the public measurement API.
- Document `getElementBounds(...)` semantics.
- Document `VirtualViewport` usage and item protocol.
- Add a TODO / future-work section matching the approved spec:
  - reverse direction
  - horizontal virtualization / scrolling
  - nested independent scroll regions
  - selection / copy
  - search
  - advanced tables
  - automatic fidelity degradation
  - richer focus preservation

### Deliverable
User-facing docs reflect the shipped v1 surface and deferred work.

---

## Suggested Execution Order

### Milestone A: Low-level platform support
1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

### Milestone B: Generic viewport
5. Phase 5
6. Phase 6

### Milestone C: Transcript proof + hardening
7. Phase 7
8. Phase 8
9. Phase 9

---

## Suggested Initial PR Breakdown

### PR 1: `clayterm` measurement helpers
- Phase 1 only

### PR 2: `clayterm` geometry query + `@tui/core` delegation
- Phase 2 + geometry part of Phase 3

### PR 3: `@tui/core` wheel events
- wheel part of Phase 3

### PR 4: Solid clip props
- Phase 4

### PR 5: Virtual scroll math core
- Phase 5

### PR 6: `VirtualViewport` component
- Phase 6

### PR 7: Transcript fixtures and blackbox coverage
- Phase 7 + Phase 8

### PR 8: Docs
- Phase 9

---

## Quality Gates
Before considering a phase complete, run the relevant checks from the repo root:

```bash
bun run fmt
bun run fmt:check
bun run lint
bun test packages/clayterm packages/core packages/solid-bindings packages/test-harness
```

For narrower phases, run focused suites first, then the broader set before merge.

Recommended focused runs:

```bash
bun test packages/clayterm
bun test packages/core
bun test packages/solid-bindings
```

For blackbox-heavy changes, prefer convergence-style assertions over fixed sleeps.
