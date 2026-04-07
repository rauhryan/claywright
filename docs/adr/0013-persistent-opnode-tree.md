# ADR 0013: Persistent OpNode Tree with Solid Reconciler

## Status

Accepted. Supersedes ADR 0001, ADR 0003, ADR 0007, ADR 0008.

## Context

Our previous architecture rebuilt the virtual DOM each frame:

```
JSX → Virtual DOM (rebuilt) → Renderable Tree (rebuilt) → Ops → Clayterm
```

This caused several problems:

1. **ID Instability**: Element IDs changed each frame, breaking Clay's element tracking
2. **Focus Loss**: Renderable instances were recreated, losing focus state
3. **Event Handler Churn**: Handlers were re-attached each frame
4. **No Fine-Grained Updates**: Full tree traversal every frame

Investigation revealed:

- **Clayterm bug**: `clayterm.c` used `idx++` as hash seed, making IDs position-dependent
- **Solid's design**: Solid's reconciler (`universal.js`) is designed to mutate a persistent tree
- **Opentui's success**: Opentui uses this pattern successfully with comprehensive tests

## Decision

We will adopt a **persistent OpNode tree** architecture, following opentui's patterns:

```
JSX → Solid Reconciler → OpNode Tree (persistent) → Ops → Clayterm
                           ↑ created once, updated in-place
```

### Core Components

1. **OpNode** - Persistent tree node that Solid's reconciler manipulates
2. **SlotOpNode** - Placeholder for conditional content (Show, Switch, For)
3. **Solid Reconciler** - Adapts `universal.js` patterns to OpNode tree
4. **Op Emission** - Traverse tree to produce flat ops array

### OpNode Structure

```typescript
class OpNode {
  id: string                    // Stable ID (created once)
  type: string                  // Element type (box, text, input)
  props: Record<string, unknown>
  children: OpNode[]
  parent: OpNode | null
  dirty: boolean                // Track if needs re-render
  
  toOps(): Op[]                 // Emit clayterm ops
  markDirty()                   // Mark self and ancestors
}

class TextOpNode extends OpNode {
  value: string
  toOps(): Op[]                 // Returns [text(value, props)]
}

class SlotOpNode extends OpNode {
  // Invisible placeholder for Show/Switch/For
  // Has no layout impact (Display.None)
  visible: boolean = false
  content: OpNode | null        // Current content or null
}
```

### Reconciler Interface

Following opentui's `RendererOptions`:

```typescript
interface ReconcilerOptions {
  createElement(tag: string): OpNode
  createTextNode(value: string): TextOpNode
  createSlotNode(): SlotOpNode
  replaceText(node: TextOpNode, value: string): void
  isTextNode(node: OpNode): boolean
  setProperty(node: OpNode, name: string, value: unknown, prev: unknown): void
  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void
  removeNode(parent: OpNode, node: OpNode): void
  getParentNode(node: OpNode): OpNode | undefined
  getFirstChild(node: OpNode): OpNode | undefined
  getNextSibling(node: OpNode): OpNode | undefined
}
```

### ID Generation

Stable IDs using per-type counter (never reset):

```typescript
const idCounter = new Map<string, number>()

function getNextId(elementType: string): string {
  const value = (idCounter.get(elementType) ?? 0) + 1
  idCounter.set(elementType, value)
  return `${elementType}-${value}`
}
```

### SlotOpNode for Control Flow

SlotOpNode handles Solid's control flow components:

- **Show**: Slot toggles between content and fallback
- **Switch/Match**: Slot swaps between matched cases
- **For**: Multiple slots for list items

```typescript
class SlotOpNode extends OpNode {
  private layoutSlot?: LayoutSlotOpNode   // For box children
  private textSlot?: TextSlotOpNode       // For text children
  
  getSlotChild(parent: OpNode): OpNode {
    // Return appropriate slot type based on parent
    if (parent instanceof TextOpNode) {
      if (!this.textSlot) this.textSlot = new TextSlotOpNode()
      return this.textSlot
    }
    if (!this.layoutSlot) this.layoutSlot = new LayoutSlotOpNode()
    return this.layoutSlot
  }
}
```

### Clayterm ID Fix

Separate from this architecture change, we must fix `clayterm.c`:

```c
// Before (broken):
Clay_ElementId eid = Clay__HashString(str, idx++);

// After (fixed):
Clay_ElementId eid = Clay__HashString(str, 0);
```

This makes Clay's element IDs depend only on the string, not position.

## Consequences

### Positive

- **Stable IDs**: OpNodes created once, IDs never change
- **Focus Preservation**: Same OpNode instance persists across frames
- **Event Handlers**: Attached once, cleaned up on destroy
- **Fine-Grained Updates**: Only dirty nodes re-emit ops
- **Solid Compatibility**: Works with Solid's control flow (Show, For, Switch)
- **Test Coverage**: Can port opentui's comprehensive tests

### Negative

- **Complexity**: More complex reconciler logic
- **Edge Cases**: Must handle destroy race conditions, scrollbox identity, etc.
- **Memory**: OpNode tree persists (not recreated each frame)

### Neutral

- **Clayterm Contract**: Still produces flat ops array, clayterm still diffs cells
- **Debugging**: Can still implement `renderToString()` for inspection
- **Performance**: Skips JS tree traversal for unchanged nodes, but clayterm still does full diff

## Implementation Phases

### Phase 1: Clayterm ID Fix
- Change `clayterm.c:504` from `idx++` to `0`
- Rebuild WASM
- Verify with existing tests

### Phase 2: OpNode Tree
- Create `OpNode`, `TextOpNode`, `SlotOpNode` classes
- Implement `toOps()` methods
- Port `id-counter.ts` from opentui

### Phase 3: Reconciler
- Port `universal.js` patterns
- Implement `RendererOptions` interface
- Handle all Solid control flow

### Phase 4: Integration
- Update `runtime.ts` to use persistent tree
- Update `Renderer` class
- Port opentui's edge case handling

### Phase 5: Testing
- Port opentui's reconciler tests
- Add blackbox tests for focus preservation
- Add tests for control flow

## References

- Opentui solid bindings: `/opentui/packages/solid/src/`
- Opentui reconciler: `/opentui/packages/solid/src/renderer/universal.js`
- Opentui slot handling: `/opentui/packages/solid/src/elements/slot.ts`
- Focus investigation: `/docs/focus-investigation.md`
