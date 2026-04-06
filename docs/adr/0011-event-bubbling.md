# ADR 0011: Event Bubbling Through Renderable Tree

## Context

We need to decide how events propagate through the component tree. Opentui uses event bubbling: events start at the target element and bubble up to ancestors.

Options:
1. **No bubbling** - Events go only to target element
2. **Bubbling** - Events bubble from target → parent → root
3. **Capturing + Bubbling** - Two-phase like DOM (capture down, bubble up)

## Decision

We will use **Option 2: Event bubbling**.

```typescript
// core/Renderable.ts
class Renderable {
  processEvent(event: TerminalEvent) {
    // 1. Call own handlers
    if (event instanceof MouseEvent) {
      this.onClick?.(event)
    } else if (event instanceof KeyboardEvent) {
      this.onKeyDown?.(event)
    }
    
    // 2. Bubble to parent unless stopped
    if (this.parent && !event.propagationStopped) {
      this.parent.processEvent(event)
    }
  }
}
```

**Event flow:**
```
click on child → child.onClick → parent.onClick → grandparent.onClick → ...
                 (can stopPropagation at any point)
```

## Status

Accepted.

## Consequences

**Positive:**
- Parent components can handle events for all children
- Event delegation pattern works (attach handler to parent)
- Matches DOM behavior (familiar to web developers)
- Matches opentui's pattern

**Negative:**
- More complex than no bubbling
- Need to understand stopPropagation
- Can have unexpected behavior if not careful

**Neutral:**
- This is simpler than DOM's two-phase (capture + bubble)
- Only bubbling phase, no capturing phase
