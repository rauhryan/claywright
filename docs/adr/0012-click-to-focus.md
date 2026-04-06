# ADR 0012: Click-to-Focus with preventDefault

## Context

We need to decide how focus changes work. Opentui uses click-to-focus: clicking on a focusable element focuses it, unless `preventDefault()` is called.

Options:
1. **Manual focus only** - Only `element.focus()` changes focus
2. **Auto-focus on click** - Clicking always focuses
3. **Auto-focus with preventDefault** - Clicking focuses unless prevented

## Decision

We will use **Option 3: Auto-focus with preventDefault**.

```typescript
// core/Renderer.ts
handlePointerEvent(event: PointerEvent) {
  const renderable = this.renderablesById.get(event.id)
  if (!renderable) return
  
  // Create and dispatch mouse event
  const mouseEvent = new MouseEvent(renderable, event)
  this.dispatchEvent(renderable, mouseEvent)
  
  // Auto-focus on left click, unless prevented
  if (event.type === "pointerclick" && 
      event.button === LEFT && 
      !mouseEvent.defaultPrevented) {
    const focusable = this.findFocusableAncestor(renderable)
    if (focusable) {
      this.focusRenderable(focusable)
    }
  }
}
```

**Event flow:**
```
click → dispatch event (bubbling) → check defaultPrevented → focus if not prevented
        (any handler can call preventDefault)
```

## Status

Accepted.

## Consequences

**Positive:**
- Intuitive: click to focus (like web)
- Can prevent focus with `preventDefault()` (for modals, overlays)
- Matches opentui's pattern
- Works with event bubbling (parent can prevent focus)

**Negative:**
- Implicit behavior (focus happens automatically)
- Need to understand preventDefault
- Can be confusing if you don't expect auto-focus

**Neutral:**
- This matches browser behavior for focusable elements
- Different from Ink (keyboard-only, no click-to-focus)
