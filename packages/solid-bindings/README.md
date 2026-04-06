# @tui/solid-bindings

Solid.js 2.0 bindings for building terminal UIs with clayterm.

## Overview

This package provides JSX-based UI components that compile down to clayterm operations. Think of it as "React Native for terminals" - you write declarative JSX, and it renders to a terminal screen.

## Quick Start

```tsx
/** @jsxImportSource @tui/solid-bindings */
import { render } from "@tui/solid-bindings";

render(() => <text>Hello World</text>);
```

## Architecture

### The Pipeline

```
JSX → Solid.js Transform → Virtual DOM → Clayterm Ops → ANSI Output
```

### Mental Model: WASM as UI Thread

Think of clayterm's WASM as your "UI thread":

```
Your App (JS)              Clayterm (WASM)
─────────────              ───────────────
Signals ──► Ops ─────────► Layout/Render/Diff ──► ANSI
(state)     (message)      (UI thread)            (output)
```

- **You manage**: App state (signals), business logic, produce ops
- **WASM manages**: Layout calculation, cell rendering, frame diffing, ANSI generation

You send ops (desired state), trust the result, and stream to stdout.

### State Layers

| Layer                  | What                                           | Where                  |
| ---------------------- | ---------------------------------------------- | ---------------------- |
| **Signals**            | App state (what the app "is")                  | Your JS code           |
| **Ops**                | Message format (what you want on screen "now") | Passed to clayterm     |
| **Front/Back buffers** | Screen cache (what was on screen)              | Clayterm WASM internal |
| **ANSI**               | Minimal output (what changed)                  | Streamed to stdout     |

## Components

### `<text>`

Renders text content.

```tsx
<text>Hello World</text>
<text color={rgba(255, 100, 50)}>Colored text</text>
```

Props:

- `color`: Text color (optional)

## JSX Transformation

The package supports two JSX transform paths:

### 1. Bun's Built-in JSX

Used when running `.tsx` files directly. Requires `jsx`, `jsxs`, `jsxDEV` exports.

### 2. Babel Preset (babel-preset-solid)

Used in test context via preload plugin. Configured with `generate: "universal"` for custom render targets.

Both produce the same virtual DOM structure.

## Virtual DOM

The virtual DOM is an intermediate representation between JSX and clayterm ops:

```
RootNode
└── ElementNode { type: "text", id: "el_0", props: {} }
    └── TextNode { value: "Hello World" }
```

### Why Virtual DOM?

1. **Solid.js compatibility**: babel-preset-solid expects tree-building functions
2. **Component composition**: Nodes can be passed around, stored, composed
3. **Debugging**: `renderToString()` shows tree structure
4. **Future optimization**: Can add layout calculations, diffing, etc.

### Why NOT for Diffing?

Clayterm already handles cell-level diffing in WASM (fast). Virtual DOM diffing in JS would be redundant. The virtual DOM is for structure, not optimization.

## Rendering

The `render()` function:

1. Creates a clayterm terminal instance
2. Builds virtual DOM from JSX
3. Converts virtual DOM to clayterm ops
4. Calls `term.render(ops)` to get ANSI output
5. Writes to stdout

## Testing

Blackbox tests spawn your script in a virtual terminal and assert on screen output:

```ts
import { createSession } from "@tui/test-harness";

const session = createSession({ cols: 40, rows: 10 });
await session.spawn("bun", [fixture]);
expect(await session.waitForText("Hello World", 2000)).toBe(true);
```

## File Structure

```
packages/solid-bindings/
├── package.json           # Dependencies and exports
├── bunfig.toml            # Bun plugin preload config
├── scripts/
│   ├── preload.ts         # Registers babel plugin
│   ├── solid-plugin.ts    # Bun plugin for .tsx files
│   └── solid-transform.ts # Babel transform with babel-preset-solid
├── src/
│   ├── jsx-runtime.ts     # Solid.js runtime + Bun JSX support
│   ├── render.ts          # Virtual DOM → clayterm ops
│   └── index.ts           # Public API
└── test/
    ├── hello.test.ts      # Blackbox test
    └── fixtures/
        └── hello.tsx      # Test script
```

## Performance Considerations

For IDE-scale interfaces (neovim, emacs, opencode):

- **Current approach**: Rebuild virtual DOM each frame, pass ops to clayterm
- **Clayterm handles**: Cell-level diffing in WASM (fast)
- **Future optimization**: Use Solid.js fine-grained reactivity to update ops in-place

The WASM is the bottleneck for large screens, not JS traversal.

## References

- [Solid.js](https://solidjs.com) - Reactive UI framework
- [babel-preset-solid](https://github.com/solidjs/solid/blob/main/packages/babel-preset-solid/README.md) - JSX transform
- [Clay](https://github.com/nicbarker/clay) - Layout engine (used by clayterm)
