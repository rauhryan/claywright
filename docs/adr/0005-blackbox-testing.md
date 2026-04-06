# ADR 0005: Blackbox Testing

## Context

Terminal UIs produce ANSI escape sequences as output. Testing approaches:

1. **Snapshot stdout**: Capture raw output and compare
2. **Unit test internals**: Test virtual DOM structure directly
3. **Blackbox testing**: Run in virtual terminal, assert on screen content

Problems with snapshot/unit approaches:

- ANSI sequences are brittle (cursor positions, color codes)
- Internal structure doesn't match what user sees
- Hard to debug failures (what went wrong on screen?)
- Doesn't catch real rendering bugs

We have ghostty-vt available: FFI bindings to Ghostty's terminal emulator, providing accurate VT parsing and screen inspection.

## Decision

We will use **blackbox testing**:

1. Spawn the script in a virtual terminal (ghostty-vt)
2. Send keyboard/mouse input
3. Assert on rendered screen content

Test structure:

```typescript
const session = createSession({ cols: 40, rows: 10 });
await session.spawn("bun", [fixture]);
expect(await session.waitForText("Hello World", 2000)).toBe(true);
session.sendKey("enter");
expect(session.containsText("Submitted")).toBe(true);
```

## Status

Accepted.

## Consequences

**Positive:**

- Tests what the user actually sees
- Catches real rendering bugs (layout, colors, positioning)
- Works with any terminal UI, not just solid-bindings
- Resilient to internal refactoring (tests behavior, not implementation)
- Can test interactions (typing, clicking, scrolling)

**Negative:**

- Slower than unit tests (process spawn overhead)
- Harder to test edge cases (timing, race conditions)
- Requires ghostty-vt native library (macOS only currently)
- Debugging failures requires understanding terminal emulation

**Neutral:**

- Test harness is reusable across all terminal UI projects
- Can add snapshot testing later for regression detection
- Blackbox tests complement, not replace, unit tests
