# ADR 0002: WASM as UI Thread

## Context

Clayterm is a WASM-based terminal renderer with these characteristics:

- **Layout engine**: Uses Clay (flexbox-like) for layout calculations
- **Double-buffered**: Maintains front and back cell buffers internally
- **Cell-level diffing**: Compares buffers and emits only changed cells
- **ANSI output**: Produces minimal escape sequences for terminal output
- **Native performance**: Layout, rendering, and diffing happen in compiled code

Each call to `term.render(ops)`:

1. Receives ops (desired screen state)
2. Performs layout calculations
3. Renders to back buffer
4. Diffs back vs front buffer
5. Returns ANSI bytes for changed cells

This is similar to how browser render threads or game engine render threads work.

## Decision

We will treat clayterm's WASM as the "UI thread" for our terminal applications.

The mental model is:

```
Your App (JS)              Clayterm (WASM)
─────────────              ───────────────
Signals ──► Ops ─────────► Layout/Render/Diff ──► ANSI
(state)     (message)      (UI thread)            (output)
```

You send ops (desired state), trust the result, and stream ANSI to stdout.

## Status

Accepted.

## Consequences

**Positive:**

- Clear separation of concerns: JS for app state, WASM for rendering
- No need to implement diffing in JavaScript
- Leverages fast native code for layout and rendering
- Simple mental model for developers

**Negative:**

- Less control over the rendering pipeline
- Debugging rendering issues requires understanding WASM internals
- Limited ability to customize layout behavior

**Neutral:**

- The WASM instance maintains state (front/back buffers) between render calls
- This is similar to how browsers handle DOM rendering
- Performance characteristics are determined by clayterm, not our JS code
