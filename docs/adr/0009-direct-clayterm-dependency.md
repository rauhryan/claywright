# ADR 0009: Direct Clayterm Dependency

## Context

We need to decide how to integrate with clayterm, our terminal rendering layer.

Options:

1. **Abstract clayterm** - Create our own interface, clayterm is one implementation
2. **Direct dependency** - Depend on clayterm directly, no abstraction
3. **Wrapper in core** - Core wraps clayterm, bindings don't see it

## Decision

We will use **Option 2: Direct dependency**.

- `@tui/core` depends on clayterm directly
- No abstraction layer between core and clayterm
- We won't swap out the native layer

```typescript
// core/Renderer.ts
import { createTerm, createInput, type Op } from "clayterm";

class Renderer {
  term: ClaytermTerminal; // direct use
  input: ClaytermInput; // direct use

  render(ops: Op[]): string {
    const { output, events } = this.term.render(ops);
    return output;
  }
}
```

## Status

Accepted.

## Consequences

**Positive:**

- Simpler architecture, less indirection
- Full access to clayterm features
- No maintenance burden for abstraction layer
- Faster development

**Negative:**

- Locked into clayterm
- Harder to swap rendering backends
- Clayterm API changes affect us directly

**Neutral:**

- Opentui owns their native layer, we depend on an external one
- This is similar to how React depends on the DOM
