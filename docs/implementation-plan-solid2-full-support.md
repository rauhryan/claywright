# Implementation Plan: Full Solid 2.0 Support in `@tui/solid-bindings`

This document describes the work required to move `@tui/solid-bindings` from its current "Solid 2-compatible surface with rebuild-per-frame runtime" state to a fully persistent renderer that supports Solid 2.0's async and boundary model correctly.

It complements, rather than replaces, the existing persistent-tree docs:

- `docs/adr/0013-persistent-opnode-tree.md`
- `docs/implementation-plan-persistent-opnode-tree.md`

## Why This Document Exists

The package now has three partially overlapping realities:

1. We depend on `solid-js@2.0.0-beta.5`
2. The JSX transform already targets Solid's universal renderer contract
3. The runtime still rebuilds the `OpNode` tree on each frame in `packages/solid-bindings/src/runtime.ts`

That means:

- basic Solid signal-driven apps work
- much of the Solid 2 API surface can be exported safely
- but the renderer does not yet fully implement the long-lived reactive tree that Solid 2's async computations, `Loading`, `Errored`, refresh semantics, and generator-driven actions want

This plan focuses on closing that gap deliberately, without regressing the working focus/input/event behavior we already have.

## Current State

### Working Today

- Solid 2 universal JSX transform via `babel-preset-solid`
- signal-driven rerendering via rebuild-per-frame runtime
- focus, input, tab navigation, stable-id focus, reorder focus, and portal blackbox coverage
- custom renderer helpers required by Solid's universal transform (`insert`, `spread`, `ref`, `mergeProps`, `createComponent`, etc.)
- public exports for much of the Solid 2 beta API surface

### Not Fully Working Yet

- persistent `OpNode` tree updates driven by long-lived Solid ownership
- `Loading` boundary semantics over a persistent tree
- `Errored` boundary swap/reset semantics over a persistent tree
- stale-while-refreshing behavior with `isPending` and `latest`
- async computations and async iterables updating an existing rendered subtree in place
- generator-based `action()` flows integrated with renderer invalidation and repaint scheduling

### Core Tension

The current runtime model is:

```text
state change -> schedule frame -> rebuild op tree -> render ops -> clayterm diffs cells
```

The desired runtime model is:

```text
initial mount -> persistent op tree
signal/async change -> Solid mutates tree in place
dirty subtree -> emit ops -> clayterm diffs cells
```

The hard part is not "support Solid 2 syntax"; it is making Solid 2's runtime semantics and our terminal renderer lifecycle agree.

## End State

We consider Solid 2.0 fully supported when all of the following are true:

- `runApp()` mounts a persistent root exactly once
- the reconciler mutates existing `OpNode`s instead of recreating the tree per frame
- `Loading` correctly shows fallback on initial unresolved reads and preserves stale content during refresh
- `Errored` correctly catches thrown errors, renders fallback, and supports reset/retry
- `For`, `Show`, `Switch`, `Match`, and `Repeat` preserve identity correctly through updates
- async computations, promises, and async iterables update live UI without rebuilding the whole tree
- generator-based `action()` flows can optimistically update state and refresh UI without breaking focus or event routing
- existing blackbox behavior remains intact

## Design Principles

### 1. Preserve Working Behavior First

Focus, input, pointer capture, and keyboard routing are already working. New architecture work must not casually break them.

### 2. Treat Clayterm as the UI Thread

We still send flat ops to clayterm. Persistent tree work changes how we produce ops, not the contract with clayterm.

### 3. Keep Solid's Ownership Model Intact

We should not emulate Solid 2 with ad hoc callbacks if the real semantics are available. The renderer should respect ownership, split effects, cleanup, and async boundary behavior.

### 4. Prefer Phased Delivery Over Big-Bang Rewrite

We need intermediate states that keep the package usable and testable.

## Workstreams

## Workstream A: Persistent Runtime Foundation

### Goal

Replace rebuild-per-frame mounting with a single persistent root.

### Required Changes

- create one root `ElementOpNode("root", "root")` per app lifetime
- mount the Solid reconciler once into that root
- stop calling `resetIdCounter()` per frame in production runtime
- move from "build whole tree in `view()`" to "Solid mutates existing tree"
- make repaint scheduling driven by dirty tree state and boundary state changes

### Risks

- focus state can break if renderable identity drifts
- event handler attachment can churn or point at stale nodes
- destroyed nodes may still receive callbacks if cleanup order is wrong

### Acceptance Criteria

- focus blackbox tests remain green
- input blackbox tests remain green
- no per-frame root recreation in `runtime.ts`

## Workstream B: Ownership, Effects, and Flush Semantics

### Goal

Align the renderer with Solid 2's split-effect and batched-update model.

### Required Changes

- audit all renderer use of `createRenderEffect`, `createEffect`, `flush`, `untrack`, and ownership-sensitive APIs
- ensure reactive reads happen in valid tracking scopes
- ensure writes inside renderer-owned reactive scopes only happen when explicitly valid
- define where `flush()` is allowed in terminal runtime code
- use `onSettled` and cleanup-returning effects where they match Solid 2 behavior better than legacy patterns

### Key Questions

- when pointer/input events update app state, do we need immediate flush, next-microtask scheduling, or both?
- which renderer-owned signals should use `pureWrite` semantics, if any?

### Acceptance Criteria

- no renderer logic depends on accidentally synchronous reads after signal writes
- effect ordering is documented and test-covered

## Workstream C: Boundary-Aware `OpNode` Tree

### Goal

Represent `Loading`, `Errored`, and control-flow changes in the persistent tree without losing identity.

### Required Changes

- formalize `SlotOpNode` and slot child behavior for layout and text parents
- ensure control flow can swap children without collapsing parent identity
- define how boundary placeholders behave in the `OpNode` tree
- support fallback/content transitions without rebuilding unrelated siblings

### Additional Boundary Requirements

- `Loading` initial fallback must not permanently replace resolved content nodes
- refresh should preserve stale rendered content while pending work continues
- `Errored` must swap to fallback on throw, and reset must restore the previous branch cleanly

### Acceptance Criteria

- unit coverage for slot insertion/removal/replacement
- blackbox coverage for `Loading`, `Errored`, `Show`, and `For`

## Workstream D: Async Computations and Async Iterables

### Goal

Make Solid 2 async computations behave naturally in terminal UI.

### Required Changes

- verify how promises and async iterables appear through our reconciler helpers
- ensure unresolved reads trigger `Loading` rather than crashing or silently flattening to nothing
- support recomputation after promise resolution without tree rebuild
- define how async iterable updates map to dirty subtree invalidation and frame scheduling

### Examples We Need to Support

- `createMemo(() => fetchUser(id()))`
- `createStore(() => query(), initial)`
- async generator streams that progressively update a subtree

### Acceptance Criteria

- blackbox fixture for first-load fallback then resolved content
- blackbox fixture for stale-during-refresh with `isPending`
- blackbox fixture for streamed async iterable updates

## Workstream E: Actions, Optimistic State, and Refresh

### Goal

Support Solid 2 mutation flows without custom renderer hacks.

### Required Changes

- test `action()` in terminal event handlers
- verify generator-driven optimistic writes propagate to the persistent tree cleanly
- integrate `refresh()` with terminal repaint scheduling
- validate `createOptimistic` / `createOptimisticStore` behavior under focus and input-heavy UIs

### Acceptance Criteria

- example fixture that performs optimistic mutation from keyboard or click input
- test that optimistic UI does not break focus identity or cursor position

## Workstream F: Public API and Type Surface

### Goal

Expose the Solid 2 surface intentionally and document what is fully supported vs provisional.

### Required Changes

- export only APIs we are prepared to support semantically
- keep universal transform helper exports aligned with Solid's expectations
- widen JSX and component typing for function children, boundary components, and async return shapes
- document runtime constraints in `packages/solid-bindings/README.md`

### Acceptance Criteria

- no missing export errors from Solid universal transform output
- examples compile with current Bun preload flow

## Workstream G: Renderable and Event Interop

### Goal

Keep `@tui/core` renderables, focus management, and event bubbling correct under persistence.

### Required Changes

- ensure `createRenderableTree()` preserves stable renderable identity where required
- decide whether renderables themselves remain ephemeral wrappers or become persistent mirrors of `OpNode`s
- ensure event callbacks observe current props, not stale closures
- preserve click-to-focus, preventDefault, drag behavior, and tab traversal

### Acceptance Criteria

- all existing core interaction blackbox tests remain green throughout migration
- add regression coverage for focus through boundary transitions

## Proposed Phases

## Phase 0: Lock In Current Baseline

Before more architecture work:

- keep the current green blackbox suite as a hard gate
- add dedicated fixtures for `Loading`, `Errored`, async recompute, and `action()` flows
- document known limitations so regressions are obvious

## Phase 1: Slot and Boundary Unit Model

Implement the tree semantics first, without changing runtime mounting.

Deliverables:

- `SlotOpNode` behavior hardened
- reconciler tests for control-flow insertion/removal
- unit tests for boundary placeholder behavior

## Phase 2: Shadow Persistent Mode

Mount a persistent tree behind a feature flag or experimental runtime path.

Deliverables:

- `runAppPersistent()` or equivalent experimental mode
- parity tests against current runtime for focus/input/tab flows
- diff of event behavior between rebuild mode and persistent mode

This phase exists to reduce risk. It is cheaper to compare two runtimes than to recover after replacing the working one outright.

## Phase 3: Initial `Loading` / `Errored` Support

Make boundary behavior correct in persistent mode before broad rollout.

Deliverables:

- `Loading` first-resolve behavior
- `Errored` fallback/reset behavior
- docs for stale-vs-fallback semantics

## Phase 4: Async Refresh and Actions

Add the richer Solid 2 async model.

Deliverables:

- `isPending`, `latest`, and `refresh` working in persistent mode
- `action()` and optimistic helpers verified in real fixtures
- async iterable example fixture

## Phase 5: Make Persistent Mode the Default

Only after all previous phases are green.

Deliverables:

- replace rebuild-per-frame runtime as default
- keep old runtime only temporarily if needed for rollback
- update ADRs, README, and package docs

## Testing Strategy

### Unit Tests

- slot identity and anchoring
- text vs layout slot behavior
- spread/ref/mergeProps helper behavior
- dirty propagation and cleanup rules
- boundary node swapping rules

### Blackbox Tests

- `Loading` first load -> resolved content
- `Loading` stale during refresh with `isPending`
- `Errored` fallback on throw and reset on retry
- `For keyed={false}` and keyed identity preservation
- `Repeat` count changes
- `action()` optimistic update via keyboard/mouse interaction
- focus preserved across loading/error transitions

### Comparison Tests

When persistent mode exists, run the same interaction fixtures against both runtimes until parity is proven.

## Known Implementation Traps

### 1. Recreating IDs in Any Form

Stable tree architecture fails immediately if IDs are recreated or position-dependent.

### 2. Mixing Rebuild and Persistent Semantics Mid-Frame

If one codepath mutates the tree in place while another recreates children, identity bugs become very hard to reason about.

### 3. Treating `Loading` as Just Conditional Rendering

`Loading` is not just `Show`. It has distinct initial pending vs refresh behavior.

### 4. Treating `Errored` as Just a Try/Catch Wrapper

Boundary reset and ownership cleanup matter. A naive catch wrapper will leak or leave stale nodes mounted.

### 5. Forcing `flush()` Everywhere

Overusing `flush()` can hide incorrect scheduling assumptions and create brittle behavior.

## Open Questions

- Should persistent mode live behind a separate runtime entrypoint until fully proven?
- Do we keep renderables ephemeral wrappers around persistent `OpNode`s, or make renderables persistent too?
- Do we need boundary-specific `OpNode` classes, or are slots sufficient?
- What is the minimal supported subset of async iterables for terminal apps?
- Should `Portal` remain a simple structural helper, or participate in renderer context once persistence lands?

## Immediate Next Steps

1. Add blackbox fixtures for `Loading`, `Errored`, and async refresh behavior
2. Write unit tests for slot and boundary tree transitions
3. Prototype persistent mode under an explicit experimental runtime entrypoint
4. Keep current working rebuild runtime as the safety baseline until parity is demonstrated

## Success Criteria

We are done when:

- the persistent runtime is the default
- all existing interaction blackbox tests still pass
- new `Loading` / `Errored` / async / optimistic tests pass
- Solid 2 examples use boundaries, async computations, and actions without renderer-specific caveats
- docs can honestly say `@tui/solid-bindings` fully supports the Solid 2 renderer model rather than only the API surface
