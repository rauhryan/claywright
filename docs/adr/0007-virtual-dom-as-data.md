# ADR 0007: Virtual DOM as Data, Renderable as Wrapper

## Context

We need to decide how to represent UI elements in our system. Opentui uses a class-based approach where `Renderable` is both the data structure and the behavior. We currently have a virtual DOM approach with `ElementNode` and `TextNode` as data structures.

Options:

1. **Class-based (like opentui)**: Renderable is both data and behavior
2. **Data + Wrapper**: ElementNode is data, Renderable wraps it with behavior
3. **Hybrid**: Renderable IS the ElementNode (merge them)

## Decision

We will use **Option 2: Data + Wrapper**.

- **ElementNode/TextNode** remain as pure data structures (virtual DOM)
- **Renderable** wraps ElementNode and adds focus/event behavior
- Renderable has a reference to its ElementNode
- Renderable reads props from ElementNode (no duplication)

```typescript
// solid-bindings/jsx-runtime.ts
class ElementNode {
  type: string
  id: string
  props: Record<string, unknown>
  children: (ElementNode | TextNode)[]
  parent: ElementNode | RootNode | null
}

// core/Renderable.ts
class Renderable {
  node: ElementNode | TextNode  // reference to virtual DOM node
  id: string
  parent: Renderable | null
  children: Renderable[]

  // Behavior
  focusable: boolean
  focused: boolean

  // Reads from node
  get onClick() { return this.node.props.onClick }
  get onKeyDown() { return this.node.props.onKeyDown }

  // Methods
  focus() { ... }
  blur() { ... }
  processEvent(event) { ... }
}
```

## Status

Accepted.

## Consequences

**Positive:**

- Clear separation: virtual DOM is data, Renderable is behavior
- Virtual DOM can be serialized, diffed, tested independently
- Renderable can be garbage collected independently from virtual DOM
- Easier to reason about: data flows one way (ElementNode → Renderable)

**Negative:**

- Two parallel tree structures (virtual DOM tree + Renderable tree)
- Need to keep trees in sync
- Slight memory overhead

**Neutral:**

- This is different from opentui's approach (they merge data and behavior)
- Similar to React's approach (virtual DOM + fiber tree)
