# ADR 0001: Virtual DOM as Intermediate Representation

## Context

We are building Solid.js bindings for clayterm, a terminal UI renderer. Several forces are at play:

- **babel-preset-solid** with `generate: "universal"` mode expects tree-building functions (`createElement`, `insertNode`, `createTextNode`, etc.) that construct a node tree incrementally.
- **Solid.js components** need to produce renderable output that can be passed to a renderer.
- **Clayterm** already handles cell-level diffing efficiently in WASM. It doesn't need us to diff at a higher level.
- **Debugging and inspection** are valuable during development—we want to see the structure of what we're rendering.
- **Component composition** patterns (passing elements as props, storing them in variables) require a representable node type.

We could skip the virtual DOM and build clayterm ops directly, but this would require a different integration with babel-preset-solid.

## Decision

We will use a virtual DOM (ElementNode, TextNode, RootNode) as an intermediate representation between JSX and clayterm ops.

The virtual DOM serves these purposes:

1. **Solid.js compatibility**: babel-preset-solid's API expects tree-building functions
2. **Component composition**: Nodes can be passed around, stored, and composed
3. **Debugging**: `renderToString()` shows tree structure

The virtual DOM is **NOT for diffing**. Clayterm handles cell-level diffing in WASM, which is faster than anything we'd implement in JS.

## Status

Accepted.

## Consequences

**Positive:**

- Works with babel-preset-solid's expected API without custom transforms
- Enables `renderToString()` for debugging and testing
- Components can be passed as props, stored in variables, composed
- Clear separation between structure (virtual DOM) and rendering (clayterm ops)

**Negative:**

- Extra traversal step to convert virtual DOM to clayterm ops
- Redundant with clayterm's internal structure (both represent a tree)
- Memory overhead of maintaining two tree representations

**Neutral:**

- The virtual DOM is an implementation detail of how we produce ops
- Can be optimized later (e.g., caching ops, reactive updates) without changing the clayterm contract
