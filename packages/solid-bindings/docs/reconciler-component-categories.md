# Reconciler Component Categories

The custom Solid reconciler in `@tui/solid-bindings` must treat not all components the same.
A large class of regressions came from applying one invocation strategy globally when the codebase
actually contains multiple component categories with different constraints.

## Categories

### 1. Declarative / boundary-preserving components

Examples:
- `Errored`
- `Loading`
- Solid control-flow and boundary-style helpers

These components MUST keep Solid's normal component semantics.
If the reconciler changes how all components are invoked, these are the first regression sentinels to check.

Typical failure mode:
- fallback branches stop swapping
- async loading transitions no longer paint intermediate states
- sibling identity/focus preservation breaks around boundaries

## 2. Stateful terminal primitives

Examples:
- `VirtualViewport`

These components own persistent local signals and may perform layout/bounds observation.
They can require narrower handling to avoid accidental re-instantiation or local state reset.

Typical failure mode:
- local scroll state resets on parent rerender
- bounds observation loops never converge
- live runtime appears to stop responding after first frame

## 3. Plain presentational components

Examples:
- wrappers that only return boxes/text and do not own important local runtime state

These usually work with the default reconciler path and should not require special treatment.

## Guidance

When debugging reconciler or runtime issues:

1. Identify which category the failing component belongs to.
2. Prefer a targeted fix before changing global component invocation.
3. If a component truly needs special handling, make that explicit with a marker API.
4. Treat `Errored`, `Loading`, and `VirtualViewport` as regression sentinels.

## Required smoke coverage after reconciler/runtime changes

Run at least:
- `mounted-errored-boundary.test.tsx`
- `slot-boundary-semantics.test.tsx`
- `virtual-viewport.blackbox.test.ts`
- `virtual-viewport-events.blackbox.test.ts`
- `boundary-focus.blackbox.test.ts`
- `action-generator.blackbox.test.ts`
