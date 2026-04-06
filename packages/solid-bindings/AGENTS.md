# AGENTS.md - @tui/solid-bindings

Context for AI assistants working on this package.

## Architecture Decision Records

Key decisions for this package are documented in the monorepo's ADR directory:

- [ADR 0001: Virtual DOM as Intermediate Representation](../../docs/adr/0001-virtual-dom-as-intermediate-representation.md)
- [ADR 0002: WASM as UI Thread](../../docs/adr/0002-wasm-as-ui-thread.md)
- [ADR 0003: Stateless Ops](../../docs/adr/0003-stateless-ops.md)
- [ADR 0004: Dual JSX Transform Support](../../docs/adr/0004-dual-jsx-transform-support.md)
- [ADR 0005: Blackbox Testing](../../docs/adr/0005-blackbox-testing.md)
- [ADR 0006: Core Package Architecture](../../docs/adr/0006-core-package-architecture.md)
- [ADR 0007: Virtual DOM as Data, Renderable as Wrapper](../../docs/adr/0007-virtual-dom-as-data.md)
- [ADR 0008: Renderable Tree Mirrors Virtual DOM](../../docs/adr/0008-renderable-tree-mirrors-virtual-dom.md)
- [ADR 0009: Direct Clayterm Dependency](../../docs/adr/0009-direct-clayterm-dependency.md)
- [ADR 0010: Two-Tier Keyboard Event Routing](../../docs/adr/0010-two-tier-keyboard-routing.md)
- [ADR 0011: Event Bubbling Through Renderable Tree](../../docs/adr/0011-event-bubbling.md)
- [ADR 0012: Click-to-Focus with preventDefault](../../docs/adr/0012-click-to-focus.md)

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

### State Layers (IMPORTANT)

| Layer                  | What                 | Where              | Mutable?            |
| ---------------------- | -------------------- | ------------------ | ------------------- |
| **Signals**            | App state            | Your JS            | Yes (via setters)   |
| **Ops**                | Desired screen state | Passed to clayterm | No (just a message) |
| **Front/Back buffers** | Screen cache         | Clayterm WASM      | Internal only       |
| **ANSI**               | Changed cells        | stdout             | N/A                 |

**Ops are stateless from your perspective.** You pass "what I want now" and clayterm figures out "what changed."

### Why Virtual DOM?

NOT for diffing (clayterm handles that in WASM). For:

1. Solid.js compatibility (babel-preset-solid expects tree-building functions)
2. Component composition
3. Debugging/inspection

## JSX Transformation

Two paths, both work:

1. **Bun's built-in**: Uses `jsx`, `jsxs`, `jsxDEV` exports
2. **Babel preset**: Uses `createElement`, `insertNode`, `createTextNode` etc.

Both produce the same virtual DOM structure.

## When Making Changes

### Adding New Elements

1. Add to `JSX.IntrinsicElements` in `jsx-runtime.ts`
2. Handle in `nodeToOps()` in `render.ts`
3. Add tests

### Performance Optimizations

For IDE-scale (500+ ops, 12,000+ cells):

- Current: Rebuild virtual DOM each frame (simple, works)
- Future: Use Solid.js fine-grained reactivity to update ops in-place
- Don't add JS-level diffing (clayterm handles this in WASM)

### The Contract with Clayterm

```ts
const { output, events } = term.render(ops, { pointer, deltaTime });
```

- `ops`: Flat array of `open()`, `text()`, `close()` operations
- `output`: ANSI bytes to write to stdout
- `events`: Pointer events (click, hover, etc.)

## Common Pitfalls

1. **Don't diff in JS** - Clayterm's WASM diffing is faster
2. **Don't make ops mutable** - They're just messages, rebuild or cache as needed
3. **Don't forget to export** - Both `index.ts` AND `jsx-runtime.ts` need exports for both transform paths

## Testing

Blackbox only. Spawn script in virtual terminal, assert on screen output:

```ts
const session = createSession({ cols: 40, rows: 10 });
await session.spawn("bun", [fixture]);
expect(await session.waitForText("text", 2000)).toBe(true);
```

## File Purposes

| File                 | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `jsx-runtime.ts`     | Node types + Solid.js runtime + Bun JSX exports |
| `render.ts`          | `render()` function, virtual DOM → clayterm ops |
| `index.ts`           | Public API, re-exports for babel preset         |
| `scripts/solid-*.ts` | Babel transform pipeline                        |
| `bunfig.toml`        | Preload config for tests                        |
