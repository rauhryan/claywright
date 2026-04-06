# ADR 0003: Stateless Ops

## Context

Clayterm's `render(ops)` API accepts a flat array of operations:

```typescript
const ops = [
  open("root", { layout: { width: grow(), height: grow() } }),
  text("Hello World", {}),
  close(),
];
const { output } = term.render(ops);
```

Clayterm maintains its own internal state:

- **Front buffer**: What was on screen last frame
- **Back buffer**: What should be on screen this frame

Each render call:

1. Receives ops (the "desired state")
2. Renders to back buffer
3. Diffs back vs front
4. Returns ANSI for changed cells

We need to produce ops from Solid.js signals. Options:

1. Rebuild ops each frame from signals
2. Cache ops and update in-place when signals change
3. Hybrid approach

## Decision

We will treat ops as **stateless messages**.

Each render call passes the "desired state" as ops. Clayterm handles the diffing internally. We don't maintain op state—we just rebuild or cache ops as needed.

The ops array is a projection of signal state into clayterm's format. It has no lifecycle or identity beyond a single render call.

## Status

Accepted.

## Consequences

**Positive:**

- Simple mental model: ops in, ANSI out
- No synchronization between JS state and op state
- Clayterm's internal buffers are the source of truth for "what was on screen"
- Easy to reason about: each frame is independent

**Negative:**

- Rebuilding ops each frame has JS traversal cost (O(nodes))
- For large UIs (500+ ops), may need optimization
- No fine-grained updates without additional architecture

**Neutral:**

- For MVP, rebuilding is acceptable
- Can optimize later with reactive ops (update in-place on signal change) without changing the clayterm contract
- The "stateless" refers to our perspective—clayterm is stateful internally
