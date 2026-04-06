# AGENTS.md - tui-monorepo

Context for AI assistants working on this monorepo.

## Overview

Terminal UI experiments around `clayterm`, with a blackbox test harness powered by `ghostty-vt`.

## Packages

| Package | Purpose |
|---------|---------|
| `core` | Focus management, event system, keyboard routing |
| `ghostty-vt` | FFI bindings to Ghostty's VT emulator |
| `test-harness` | Blackbox testing utilities for TUIs |
| `solid-bindings` | Solid.js 2.0 JSX bindings for clayterm |
| `clayterm-examples` | Example apps demonstrating clayterm |
| `clayterm` | Vendored terminal renderer (git submodule) |

## Architecture Decision Records

Key architectural decisions are documented in `docs/adr/`:

- [ADR 0001: Virtual DOM as Intermediate Representation](docs/adr/0001-virtual-dom-as-intermediate-representation.md)
- [ADR 0002: WASM as UI Thread](docs/adr/0002-wasm-as-ui-thread.md)
- [ADR 0003: Stateless Ops](docs/adr/0003-stateless-ops.md)
- [ADR 0004: Dual JSX Transform Support](docs/adr/0004-dual-jsx-transform-support.md)
- [ADR 0005: Blackbox Testing](docs/adr/0005-blackbox-testing.md)
- [ADR 0006: Core Package Architecture](docs/adr/0006-core-package-architecture.md)
- [ADR 0007: Virtual DOM as Data, Renderable as Wrapper](docs/adr/0007-virtual-dom-as-data.md)
- [ADR 0008: Renderable Tree Mirrors Virtual DOM](docs/adr/0008-renderable-tree-mirrors-virtual-dom.md)
- [ADR 0009: Direct Clayterm Dependency](docs/adr/0009-direct-clayterm-dependency.md)
- [ADR 0010: Two-Tier Keyboard Event Routing](docs/adr/0010-two-tier-keyboard-routing.md)
- [ADR 0011: Event Bubbling Through Renderable Tree](docs/adr/0011-event-bubbling.md)
- [ADR 0012: Click-to-Focus with preventDefault](docs/adr/0012-click-to-focus.md)

## Key Concepts

### Clayterm Mental Model

Clayterm's WASM is the "UI thread":
```
Your App (JS)              Clayterm (WASM)
─────────────              ───────────────
Signals ──► Ops ─────────► Layout/Render/Diff ──► ANSI
(state)     (message)      (UI thread)            (output)
```

You send ops (desired state), trust the result, stream to stdout.

### State Layers

| Layer | What | Where |
|-------|------|-------|
| Signals | App state | Your JS |
| Ops | Desired screen state | Passed to clayterm |
| Front/Back buffers | Screen cache | Clayterm WASM internal |
| ANSI | Changed cells | stdout |

## Running Tests

```bash
# All relevant packages
bun test packages/ghostty-vt packages/solid-bindings packages/test-harness packages/clayterm-examples

# Specific package
bun test packages/solid-bindings
```

## Building Clayterm

Clayterm is a git submodule. Build it with:

```bash
bun run build:clayterm
```

## Import Resolution

Clayterm imports are resolved via `tsconfig.json` path aliases:
```json
{
  "clayterm": ["packages/clayterm/build/npm/esm/mod.js"]
}
```
