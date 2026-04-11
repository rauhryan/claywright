# AGENTS.md - @tui/solid-bindings

Context for AI assistants working on this package.

## Architecture Decision Records

Key decisions for this package are documented in the monorepo's ADR directory:

- [ADR 0001: Virtual DOM as Intermediate Representation](../../docs/adr/0001-virtual-dom-as-intermediate-representation.md) (Superseded)
- [ADR 0002: WASM as UI Thread](../../docs/adr/0002-wasm-as-ui-thread.md)
- [ADR 0003: Stateless Ops](../../docs/adr/0003-stateless-ops.md) (Superseded)
- [ADR 0004: Dual JSX Transform Support](../../docs/adr/0004-dual-jsx-transform-support.md)
- [ADR 0005: Blackbox Testing](../../docs/adr/0005-blackbox-testing.md)
- [ADR 0006: Core Package Architecture](../../docs/adr/0006-core-package-architecture.md)
- [ADR 0007: Virtual DOM as Data, Renderable as Wrapper](../../docs/adr/0007-virtual-dom-as-data.md) (Superseded)
- [ADR 0008: Renderable Tree Mirrors Virtual DOM](../../docs/adr/0008-renderable-tree-mirrors-virtual-dom.md) (Superseded)
- [ADR 0009: Direct Clayterm Dependency](../../docs/adr/0009-direct-clayterm-dependency.md)
- [ADR 0010: Two-Tier Keyboard Event Routing](../../docs/adr/0010-two-tier-keyboard-routing.md)
- [ADR 0011: Event Bubbling Through Renderable Tree](../../docs/adr/0011-event-bubbling.md)
- [ADR 0012: Click-to-Focus with preventDefault](../../docs/adr/0012-click-to-focus.md)
- **[ADR 0013: Persistent OpNode Tree](../../docs/adr/0013-persistent-opnode-tree.md)** (Current)
- [Reconciler Component Categories](./docs/reconciler-component-categories.md)

## What This Package Does

Solid.js 2.0 bindings that compile JSX to clayterm terminal operations. Think "React Native for terminals."

## Architecture Mental Model

### The Key Insight: WASM is the UI Thread

```
Your App (JS)              Clayterm (WASM)
─────────────              ───────────────
Signals ──► Ops ─────────► Layout/Render/Diff ──► ANSI
(state)     (message)      (UI thread)            (output)
```

**You send ops (desired state), trust the result, stream to stdout.**

### Persistent OpNode Tree (ADR 0013)

```
JSX → Solid Reconciler → OpNode Tree (persistent) → Ops → Clayterm
                           ↑ created once, updated in-place
```

The OpNode tree is the source of truth:
- Created once when the app starts
- Updated in-place by Solid's reconciler
- Each OpNode has a stable ID
- Dirty tracking for efficient op emission

### State Layers

| Layer                  | What                 | Where              | Mutable?            |
| ---------------------- | -------------------- | ------------------ | ------------------- |
| **Signals**            | App state            | Your JS            | Yes (via setters)   |
| **OpNode Tree**        | UI structure         | Solid reconciler   | Yes (in-place)      |
| **Ops**                | Desired screen state | Passed to clayterm | No (just a message) |
| **Front/Back buffers** | Screen cache         | Clayterm WASM      | Internal only       |
| **ANSI**               | Changed cells        | stdout             | N/A                 |

### Why Persistent Tree?

1. **Stable IDs**: OpNodes created once, IDs never change
2. **Focus Preservation**: Same OpNode instance persists across frames
3. **Event Handlers**: Attached once, cleaned up on destroy
4. **Fine-Grained Updates**: Only dirty nodes re-emit ops
5. **Solid Compatibility**: Works with Solid's control flow (Show, For, Switch)

## Key Components

### OpNode Classes

| Class | Purpose |
|-------|---------|
| `OpNode` | Base class, tree structure, dirty tracking |
| `ElementOpNode` | Box, text, input elements |
| `TextOpNode` | Text content nodes |
| `SlotOpNode` | Placeholder for Show/Switch/For |

### Reconciler

Follows opentui's `universal.js` patterns:
- `createElement()` - Create OpNode with stable ID
- `setProperty()` - Update props in-place
- `insertNode()` / `removeNode()` - Tree mutations
- Array reconciliation with LIS algorithm

## When Making Changes

### Adding New Elements

1. Add to `JSX.IntrinsicElements` in `jsx-runtime.ts`
2. Handle in `ElementOpNode.toOps()`
3. Add tests

### Clayterm ID Stability

**Critical**: Clayterm must use stable IDs. The fix in `clayterm.c`:

```c
// Correct - ID depends only on string
Clay_ElementId eid = Clay__HashString(str, 0);

// Wrong - ID depends on position
Clay_ElementId eid = Clay__HashString(str, idx++);
```

### The Contract with Clayterm

```ts
const { output, events } = term.render(ops, { pointer, deltaTime });
```

- `ops`: Flat array of `open()`, `text()`, `close()` operations
- `output`: ANSI bytes to write to stdout
- `events`: Pointer events (click, hover, etc.)

## Common Pitfalls

1. **Don't reset ID counter** - IDs must be unique across the app lifetime
2. **Don't recreate OpNodes** - Update in-place, don't rebuild
3. **Handle destroy race conditions** - Check `isDestroyed` after user callbacks
4. **Validate text node parents** - Text nodes must have text parent

## Testing

### Required smoke suites after reconciler/runtime/event-routing changes

If you touch any of these areas:
- reconciler component invocation
- runtime frame scheduling
- renderable tree creation
- pointer or wheel routing
- boundary/control-flow semantics

Run at least these suites before considering the change safe:
- `packages/solid-bindings/test/mounted-errored-boundary.test.tsx`
- `packages/solid-bindings/test/slot-boundary-semantics.test.tsx`
- `packages/solid-bindings/test/virtual-viewport.blackbox.test.ts`
- `packages/solid-bindings/test/virtual-viewport-events.blackbox.test.ts`
- `packages/solid-bindings/test/boundary-focus.blackbox.test.ts`
- `packages/solid-bindings/test/action-generator.blackbox.test.ts`


Blackbox only. Spawn script in virtual terminal, assert on screen output:

```ts
const session = createSession({ cols: 40, rows: 10 });
await session.spawn("bun", [fixture]);
expect(await session.waitForText("text", 2000)).toBe(true);
```

For interaction tests, prefer convergence-style helpers over blind sleeps:

```ts
await session.spawn("bun", [fixture]);
session.click(3, 2);

const focused = await session.waitForTextConvergence("Focused: yes", {
  timeout: 2000,
  settleMs: 100,
});
expect(focused).not.toBeNull();

session.sendKey("h");
expect(await session.waitForFrameText("Value: h", { timeout: 2000 })).not.toBeNull();
```

Preference order:

1. `waitForText()` for initial readiness
2. `waitForTextConvergence()` for settled visible UI state
3. `waitForFrame()` / `waitForFrameText()` for transient intermediate states
4. `wait()` only when modeling deliberate elapsed time or when there is no observable convergence signal

## File Purposes

| File | Purpose |
|------|---------|
| `opnode/*.ts` | OpNode classes (persistent tree nodes) |
| `reconciler/*.ts` | Solid reconciler implementation |
| `runtime.ts` | App runtime, input handling, frame loop |
| `jsx-runtime.ts` | JSX exports for Bun's built-in transform |
| `index.ts` | Public API |

## Implementation Plan

See [Implementation Plan: Persistent OpNode Tree](../../docs/implementation-plan-persistent-opnode-tree.md) for detailed steps.
