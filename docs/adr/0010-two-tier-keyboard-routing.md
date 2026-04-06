# ADR 0010: Two-Tier Keyboard Event Routing

## Context

We need to decide how keyboard events flow through the system. Opentui uses a two-tier system:
1. Global handlers (app-level shortcuts)
2. Focused element handlers (element-specific input)

Options:
1. **Focused only** - Only focused element receives keyboard events
2. **Global only** - All keyboard events go to global handlers
3. **Two-tier (like opentui)** - Global handlers first, then focused element

## Decision

We will use **Option 3: Two-tier keyboard routing**.

```typescript
// core/KeyHandler.ts
class InternalKeyHandler {
  globalHandlers: Set<Function>
  focusedHandler: Function | null
  
  emit(event: KeyboardEvent) {
    // 1. Global handlers first
    for (const handler of this.globalHandlers) {
      handler(event)
      if (event.propagationStopped) return
    }
    
    // 2. Focused element handler (if not prevented)
    if (!event.defaultPrevented && this.focusedHandler) {
      this.focusedHandler(event)
    }
  }
}
```

**Event flow:**
```
keypress → global handlers → focused element handler
           (can stopPropagation)
                          (skipped if preventDefault)
```

## Status

Accepted.

## Consequences

**Positive:**
- App-level shortcuts work even when an element is focused
- Focused element can be skipped via `preventDefault()`
- Matches opentui's proven pattern
- Flexible: can handle both app shortcuts and input

**Negative:**
- More complex than single-tier
- Need to understand preventDefault vs stopPropagation
- Global handlers can interfere with focused element

**Neutral:**
- This matches browser/DOM behavior (capture → target → bubble)
- Different from Ink (single-tier, focused only)
