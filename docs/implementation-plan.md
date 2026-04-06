# Implementation Plan: Core Package + Focus/Events

## Overview

Build `@tui/core` package with focus management and event system, following opentui's architecture.

---

## Phase 1: Core Package Foundation

**Goal:** Create core package with basic structure

**What to build:**

1. Create `packages/core/` directory structure
2. `Renderable.ts` - Base class with id, parent, children
3. `events.ts` - TerminalEvent, MouseEvent, KeyboardEvent classes
4. `index.ts` - Exports
5. `package.json` - Dependencies (clayterm)

**Test:**

```ts
import { Renderable, MouseEvent } from "@tui/core";

const renderable = new Renderable("test");
expect(renderable.id).toBe("test");
```

**Unknowns resolved:**

- Package structure
- Event class API
- Basic Renderable structure

---

## Phase 2: Renderer with Clayterm Integration

**Goal:** Renderer wraps clayterm, can render ops

**What to build:**

1. `Renderer.ts` - Wraps clayterm's createTerm, createInput
2. `render()` method - Takes ops, returns output
3. Basic render loop (no events yet)

**Test:**

```ts
const renderer = new Renderer({ width: 80, height: 24 });
const ops = [open("root", {}), text("Hello"), close()];
const output = renderer.render(ops);
expect(output).toContain("Hello");
```

**Unknowns resolved:**

- How Renderer wraps clayterm
- Render loop structure

---

## Phase 3: Hit Grid (Element ID Mapping)

**Goal:** Map clayterm element IDs to Renderables

**What to build:**

1. `HitGrid.ts` - Map<string, Renderable>
2. `Renderer.setRoot(renderable)` - Builds ID map from tree
3. `Renderer.findRenderable(id)` - Lookup by ID

**Test:**

```ts
const root = new Renderable("root");
const child = new Renderable("child");
root.children.push(child);

renderer.setRoot(root);
expect(renderer.findRenderable("child")).toBe(child);
```

**Unknowns resolved:**

- How to map clayterm IDs to our Renderables
- Tree traversal for ID mapping

---

## Phase 4: Focus Management

**Goal:** Track and change focus

**What to build:**

1. `Renderable.focusable` property
2. `Renderable.focused` property
3. `Renderable.focus()` / `blur()` methods
4. `Renderer.focusedRenderable` tracking
5. `Renderer.focusRenderable(renderable)` method

**Test:**

```ts
const box = new Renderable("box");
box.focusable = true;

renderer.focusRenderable(box);
expect(box.focused).toBe(true);
expect(renderer.focusedRenderable).toBe(box);

box.blur();
expect(box.focused).toBe(false);
```

**Unknowns resolved:**

- Focus state management
- Focus change API

---

## Phase 5: Event Classes and Bubbling

**Goal:** Events bubble through Renderable tree

**What to build:**

1. `TerminalEvent` base class with `stopPropagation()`, `preventDefault()`
2. `MouseEvent` class with x, y, button
3. `KeyboardEvent` class with key, ctrl, alt, shift
4. `Renderable.processEvent(event)` - bubbles to parent

**Test:**

```ts
const parent = new Renderable("parent");
const child = new Renderable("child");
parent.children.push(child);

let parentGotEvent = false;
parent.onClick = () => (parentGotEvent = true);

child.processEvent(new MouseEvent("click", { x: 0, y: 0 }));
expect(parentGotEvent).toBe(true); // bubbled

// Test stopPropagation
parentGotEvent = false;
child.onClick = (e) => e.stopPropagation();
child.processEvent(new MouseEvent("click", { x: 0, y: 0 }));
expect(parentGotEvent).toBe(false); // stopped
```

**Unknowns resolved:**

- Event bubbling mechanism
- stopPropagation behavior

---

## Phase 6: Click-to-Focus

**Goal:** Clicking on element focuses it

**What to build:**

1. `Renderer.handlePointerEvent(event)` - From clayterm
2. Find Renderable by ID
3. Dispatch MouseEvent (bubbling)
4. Auto-focus if not prevented
5. `findFocusableAncestor(renderable)` - Walk up tree

**Test:**

```ts
const box = new Renderable("box");
box.focusable = true;
renderer.setRoot(box);

// Simulate click from clayterm
renderer.handlePointerEvent({
  type: "pointerclick",
  id: "box",
  button: 0, // left click
});

expect(box.focused).toBe(true);

// Test preventDefault
box.focused = false;
box.onMouseDown = (e) => e.preventDefault();
renderer.handlePointerEvent({ type: "pointerclick", id: "box", button: 0 });
expect(box.focused).toBe(false); // prevented
```

**Unknowns resolved:**

- Click-to-focus mechanism
- preventDefault for focus

---

## Phase 7: Keyboard Event Routing

**Goal:** Keyboard events go to focused element

**What to build:**

1. `KeyHandler.ts` - Two-tier keyboard routing
2. `InternalKeyHandler` with global + focused handlers
3. `Renderer.handleKeyEvent(event)` - From clayterm input
4. `Renderable.focus()` subscribes to keypress
5. `Renderable.blur()` unsubscribes

**Test:**

```ts
const box = new Renderable("box");
box.focusable = true;
box.onKeyDown = (e) => console.log(e.key);

renderer.focusRenderable(box);

// Simulate keypress from clayterm
renderer.handleKeyEvent({ key: "a", ctrl: false });
// box.onKeyDown called with "a"
```

**Unknowns resolved:**

- Two-tier keyboard routing
- Focused element subscription

---

## Phase 8: Solid Bindings Integration

**Goal:** solid-bindings uses core

**What to build:**

1. `solid-bindings/reconciler.ts` - Creates Renderables from ElementNodes
2. `solid-bindings/runtime.ts` - Uses core Renderer
3. Update `runApp()` to use core

**Test:**

```tsx
// Existing test should still work
runApp(() => <text>Hello</text>);
// But now uses core under the hood
```

**Unknowns resolved:**

- How reconciler creates Renderables
- Integration with existing solid-bindings

---

## Phase 9: Input Element

**Goal:** Basic text input works

**What to build:**

1. `core/elements/Input.ts` - Input Renderable
2. Track value, cursorOffset
3. Handle keypresses (typing, backspace, arrows)
4. Render cursor (invert character)
5. `solid-bindings/elements/input.ts` - JSX element

**Test:**

```tsx
const [value, setValue] = createSignal("");

runApp(() => <input value={value()} onInput={setValue} placeholder="Type here..." />);

// Type "hello"
// See "hello" on screen
// value() === "hello"
```

**Unknowns resolved:**

- Input state management
- Cursor rendering
- Text editing logic

---

## Phase 10: Tab Navigation

**Goal:** Tab cycles through focusable elements

**What to build:**

1. Collect focusable Renderables in tree order
2. Handle Tab key in global handler
3. `focusNext()` / `focusPrevious()` methods
4. Optional: `tabIndex` prop for explicit order

**Test:**

```tsx
runApp(() => (
  <box>
    <input id="first" />
    <input id="second" />
    <input id="third" />
  </box>
));

// Press Tab
// Focus moves: first → second → third → first
```

**Unknowns resolved:**

- Focus order
- Tab key handling

---

## Phase Dependencies

```
Phase 1 (Foundation) ──► Phase 2 (Renderer) ──► Phase 3 (Hit Grid)
                                                      │
                                                      ▼
Phase 4 (Focus) ◄─────────────────────────────────────┘
        │
        ▼
Phase 5 (Events) ──► Phase 6 (Click-to-Focus)
        │
        ▼
Phase 7 (Keyboard) ──► Phase 8 (Integration) ──► Phase 9 (Input)
                                                      │
                                                      ▼
                                              Phase 10 (Tab)
```

---

## Estimated Effort

| Phase             | Effort  | Risk   |
| ----------------- | ------- | ------ |
| 1. Foundation     | 1 day   | Low    |
| 2. Renderer       | 1 day   | Low    |
| 3. Hit Grid       | 0.5 day | Low    |
| 4. Focus          | 1 day   | Medium |
| 5. Events         | 1 day   | Medium |
| 6. Click-to-Focus | 0.5 day | Low    |
| 7. Keyboard       | 1 day   | Medium |
| 8. Integration    | 2 days  | High   |
| 9. Input          | 2 days  | High   |
| 10. Tab           | 0.5 day | Low    |

**Total:** ~10 days
