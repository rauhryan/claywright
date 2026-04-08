# ADR 0014: requestAnimationFrame — Bridging Timer-Driven State to the Render Cycle

## Status

Accepted.

## Context

The Solid runtime's `runApp` only renders when `frame()` is scheduled. `frame()` is scheduled by `scheduleFrame()`, which is called when OpNodes are marked dirty via `setProperty()`, which only runs inside a Solid effect re-evaluation, which only happens during `flush()`.

Input-driven updates work because `process.stdin.on("data")` explicitly calls `scheduleFrame()` after processing. But timer-driven updates (animations, polling, async callbacks) have no such bridge — the `setInterval` callback writes a Solid signal, but nobody tells the runtime to render a new frame.

### Solid 2.0 Batching

Solid 2.0 (beta 5) introduces batched signal commits. After `setFrame(n+1)`, the getter `frame()` returns the **previous** (uncommitted) value until `flush()` is called. This is a change from Solid 1.x where reads were always synchronous.

The runtime's `renderFramePass()` already calls `flush()` at the start of each frame, which commits pending signal updates and re-runs dirty effects. This means `requestAnimationFrame()` simply needs to call `frame()` — the `flush()` inside `renderFramePass()` handles the Solid batching.

### The Rendering Pipeline

```
requestAnimationFrame() → frame() → renderFramePass()
  → flush()                  // commit signal updates, re-run effects
  → setProperty() → markDirty() → scheduleFrame()  // (coalesced if frame in progress)
  → build renderable tree    // from updated OpNodes
  → render to ANSI           // write to stdout
  → flush()                  // any additional updates from event handlers
```

## Decision

Add `requestAnimationFrame` to the `AppContext` interface. This exposes `frame()` to the view function so timer-driven state changes can trigger a render after updating signals.

```typescript
export interface AppContext {
  width: number;
  height: number;
  pointer: { x: number; y: number; down: boolean };
  requestAnimationFrame: () => void;
}
```

### Implementation

`requestAnimationFrame()` calls `frame()` directly. The `flush()` inside `renderFramePass()` commits Solid 2.0 batched signal updates, so the pattern is simply:

```tsx
let raf: () => void;

runApp((ctx) => {
  raf = ctx.requestAnimationFrame;

  const interval = setInterval(() => {
    setFrame((f) => (f + 1) % TOTAL_FRAMES);
    raf(); // triggers frame → flush → render
  }, 120);

  return <box>...</box>;
});
```

### Why this name?

The browser's `requestAnimationFrame` is the exact same concept: JavaScript code that modifies state calls `requestAnimationFrame(cb)` to ensure the browser repaints. Developers already know this pattern.

### Why not auto-detect?

Options considered:

1. **Watch all Solid signals for mutations** — Overhead and complexity for zero benefit in the input-driven path.
2. **Poll in the event loop** — Wastes CPU when nothing is changing.
3. **Make `flush()` always schedule a frame** — `flush()` runs inside `frame()`, creating unbounded recursion without a guard.
4. **`createEffect` watcher** — Requires understanding the effect lifecycle; explicit call is simpler.

### Coalescing

`scheduleFrame()` has a `frameScheduled` guard, and `frame()` has a `frameInProgress` guard. Calling `requestAnimationFrame()` multiple times within the same tick or while a frame is in progress coalesces into a single render.

### Important: Solid 2.0 signal reads return stale values

After `setSignal(newValue)`, the getter returns the **old** value until `flush()` commits the update. This means code in the timer callback that reads the signal (e.g., `frame()` in the JSX) will return the pre-update value. The correct value is visible only after `flush()` runs inside `renderFramePass()`.

This has an important implication: **never capture signal values in local variables outside the reactive view function**. For example:

```tsx
// WRONG — captures stale value at mount time
runApp((ctx) => {
  const isRunning = running(); // captures false, never updates
  return <box bg={squareColor(i, frame(), isRunning)}>...</box>;
});

// CORRECT — signal getter called in JSX, tracked by createRenderEffect
runApp((ctx) => {
  return <box bg={squareColor(i, frame(), running())}>...</box>;
});
```

## Consequences

### Positive

- **Timer-driven animations work** — `setInterval` + `requestAnimationFrame` produces smooth animations
- **Async callbacks work** — `fetch` completions, WebSocket messages, etc. can trigger renders
- **Explicit over implicit** — Component authors know when they're requesting a frame
- **Familiar API** — `requestAnimationFrame` is universally understood
- **Coalesced** — Multiple calls per tick produce one render
- **No performance overhead** — No polling, no signal wrapping, no watcher overhead

### Negative

- **Manual** — Component authors must remember to call `requestAnimationFrame()` after timer-driven state changes
- **Easy to forget** — A common bug will be "animation doesn't update" because `requestAnimationFrame` was omitted
- **Stale local variables** — Solid 2.0's batched reads mean `const val = signal()` captures a stale value

### Mitigations

- A `useAnimationLoop` utility hook can wrap the pattern
- Error messages or dev-mode warnings when signals change without a pending frame
- Documentation highlighting the `const val = signal()` pitfall

## References

- Browser `requestAnimationFrame`: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- Solid 2.0 batched signals: `@solidjs/signals` `flush()` commits pending updates
- ADR 0013: Persistent OpNode Tree