# ADR 0006: Core Package Architecture

## Context

We are building Solid.js bindings for terminal UIs using clayterm as the rendering layer. We need to decide how to organize the code and what abstractions to create.

Opentui, a similar project, uses a two-package architecture:
- `@opentui/core` - All rendering, focus, events, and component logic
- `@opentui/solid` - Thin JSX bindings that map to core

We currently have `@tui/solid-bindings` which contains:
- Virtual DOM (ElementNode, TextNode, RootNode)
- JSX runtime
- Rendering logic (virtual DOM → clayterm ops)
- Runtime (runApp)

## Decision

We will create a `@tui/core` package following opentui's architecture:

```
packages/
├── core/                    # Focus, events, keyboard routing
│   ├── Renderable.ts       # Base class with focus/event behavior
│   ├── Renderer.ts         # Wraps clayterm, manages focus
│   ├── events.ts           # TerminalEvent, MouseEvent, KeyboardEvent
│   ├── KeyHandler.ts       # Two-tier keyboard routing
│   └── HitGrid.ts          # Element ID → Renderable mapping
│
└── solid-bindings/         # JSX → core
    ├── jsx-runtime.ts      # Virtual DOM (ElementNode, etc.)
    ├── reconciler.ts       # Maps JSX → core Renderables
    └── elements/           # Element definitions
```

## Status

Accepted.

## Consequences

**Positive:**
- Clear separation of concerns (core = behavior, bindings = JSX)
- Can reuse core with other frameworks (React, etc.) in the future
- Follows proven architecture from opentui
- Core can be tested independently

**Negative:**
- More packages to maintain
- Additional indirection layer
- Need to manage dependencies between packages

**Neutral:**
- This matches opentui's architecture, making it easier to learn from their patterns
- The core package will depend on clayterm directly
