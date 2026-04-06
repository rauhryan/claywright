# ADR 0008: Renderable Tree Mirrors Virtual DOM

## Context

We have two tree structures:

1. **Virtual DOM tree** - ElementNode/TextNode created by JSX
2. **Renderable tree** - Renderable instances that handle focus/events

We need to decide when and how the Renderable tree is created and updated.

Options:

1. **Rebuild every frame** - Create new Renderable tree from virtual DOM each frame
2. **Create once, update in place** - Create once, then diff and update
3. **Mirror with references** - Renderable tree mirrors virtual DOM, Renderable has reference to ElementNode

## Decision

We will use **Option 3: Mirror with references**.

- Renderable tree is created once when the app starts
- Each Renderable has a reference to its corresponding ElementNode
- When ElementNode props change, Renderable sees the change (same object reference)
- No need to rebuild or diff the tree structure

```typescript
// Renderable tree mirrors virtual DOM structure
const elementNode = new ElementNode("box");
const renderable = new Renderable(elementNode);

// Later, when props change
elementNode.props.focusable = true;
// Renderable sees the change immediately (same object)
renderable.focusable; // true (reads from node.props.focusable)
```

## Status

Accepted.

## Consequences

**Positive:**

- No tree rebuilding overhead
- No diffing algorithm needed
- Simple mental model: one Renderable per ElementNode
- Prop changes flow through naturally

**Negative:**

- Renderable tree must be kept in sync with virtual DOM structure
- Adding/removing children requires updating both trees
- Need to manage Renderable lifecycle (creation, destruction)

**Neutral:**

- This is similar to how React Fiber works (fiber tree mirrors element tree)
- Different from opentui (they don't have a separate virtual DOM)
