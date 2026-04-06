# Rough Phases: Core Package + Focus/Events

## Phase 1: Core Package Foundation
- Create `packages/core/` directory
- `Renderable.ts` - Base class (id, parent, children)
- `events.ts` - TerminalEvent, MouseEvent, KeyboardEvent
- `package.json` with clayterm dependency
- Basic exports

## Phase 2: Renderer with Clayterm
- `Renderer.ts` wrapping clayterm
- `createTerm()`, `createInput()` integration
- Basic `render(ops)` method
- Render loop structure

## Phase 3: Hit Grid (ID Mapping)
- `Map<string, Renderable>` for element lookup
- `Renderer.setRoot(renderable)` builds map from tree
- `Renderer.findRenderable(id)` lookup
- Tree traversal

## Phase 4: Focus Management
- `Renderable.focusable` property
- `Renderable.focused` property
- `Renderable.focus()` / `blur()` methods
- `Renderer.focusedRenderable` tracking
- `Renderer.focusRenderable(renderable)`

## Phase 5: Event Classes + Bubbling
- `TerminalEvent` base (stopPropagation, preventDefault)
- `MouseEvent` (x, y, button, target)
- `KeyboardEvent` (key, ctrl, alt, shift)
- `Renderable.processEvent(event)` bubbles to parent
- Event handlers (onClick, onKeyDown, etc.)

## Phase 6: Click-to-Focus
- `Renderer.handlePointerEvent()` from clayterm
- Find Renderable by clayterm element ID
- Dispatch MouseEvent (bubbling)
- Auto-focus if `!event.defaultPrevented`
- `findFocusableAncestor()` walks up tree

## Phase 7: Keyboard Routing
- `KeyHandler.ts` two-tier system
- Global handlers (app shortcuts)
- Focused element handler
- `Renderable.focus()` subscribes to keypress
- `Renderable.blur()` unsubscribes

## Phase 8: Solid Bindings Integration
- `reconciler.ts` creates Renderables from ElementNodes
- Update `runApp()` to use core Renderer
- Renderable tree mirrors virtual DOM
- Props flow from ElementNode → Renderable

## Phase 9: Input Element
- `Input.ts` Renderable in core
- Track `value`, `cursorOffset`
- Handle keypresses (type, backspace, arrows)
- Render cursor (invert character)
- `<input>` JSX element in solid-bindings

## Phase 10: Tab Navigation
- Collect focusable Renderables in tree order
- Tab key in global handler
- `focusNext()` / `focusPrevious()`
- Optional: `tabIndex` for explicit order

---

## Dependencies

```
1 → 2 → 3 → 4
          ↓
5 → 6 → 7 → 8 → 9 → 10
```

## Key Risks

| Phase | Risk | Why |
|-------|------|-----|
| 4 | Medium | Focus state management is tricky |
| 5 | Medium | Event bubbling edge cases |
| 7 | Medium | Two-tier routing complexity |
| 8 | High | Integration with existing code |
| 9 | High | Input is complex (cursor, editing) |

## Open Questions

1. **Phase 8:** How exactly does reconciler create Renderables? Per-frame or once?
2. **Phase 9:** Should Input be in core or solid-bindings?
3. **Phase 10:** Spatial navigation or render order only?
