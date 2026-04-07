# Implementation Plan: Persistent OpNode Tree

This document details the implementation of the persistent OpNode tree architecture (ADR 0013).

## Overview

We are replacing the rebuild-each-frame architecture with a persistent tree that Solid's reconciler manipulates directly. This follows opentui's proven patterns.

## Phase 1: Clayterm ID Fix (Quick Win)

### Goal
Fix the ID stability bug in clayterm's C code.

### Change
File: `packages/clayterm/src/clayterm.c`

```c
// Line 487-504, change:
uint32_t idx = 0;
...
Clay_ElementId eid = Clay__HashString(str, idx++);

// To:
Clay_ElementId eid = Clay__HashString(str, 0);
```

### Steps
1. Edit `clayterm.c`
2. Rebuild WASM: `bun run build:clayterm`
3. Run existing tests to verify no regression
4. Test focus/click behavior

### Verification
- Same ID string produces same hash regardless of position
- Elements maintain identity across frames
- Focus state preserved when structure doesn't change

---

## Phase 2: OpNode Tree Foundation

### Goal
Create the persistent OpNode classes that will replace the virtual DOM.

### Files to Create

#### `packages/solid-bindings/src/opnode/OpNode.ts`

```typescript
import { open, close, text, type Op } from "clayterm"
import { toSizingAxis } from "../render"

export abstract class OpNode {
  id: string
  type: string
  props: Record<string, unknown> = {}
  children: OpNode[] = []
  parent: OpNode | null = null
  protected _dirty: boolean = true

  constructor(type: string, id: string) {
    this.type = type
    this.id = id
  }

  get isDirty(): boolean {
    return this._dirty
  }

  markClean(): void {
    this._dirty = false
  }

  markDirty(): void {
    this._dirty = true
    // Mark ancestors dirty too (layout may change)
    this.parent?.markDirty()
  }

  abstract toOps(): Op[]

  add(child: OpNode, index?: number): void {
    if (child.parent) {
      child.parent.remove(child)
    }
    child.parent = this
    if (index !== undefined) {
      this.children.splice(index, 0, child)
    } else {
      this.children.push(child)
    }
    this.markDirty()
  }

  remove(child: OpNode): void {
    const idx = this.children.indexOf(child)
    if (idx >= 0) {
      this.children.splice(idx, 1)
      child.parent = null
      this.markDirty()
    }
  }

  insertBefore(child: OpNode, anchor: OpNode): void {
    const idx = this.children.indexOf(anchor)
    if (idx >= 0) {
      this.add(child, idx)
    }
  }

  getFirstChild(): OpNode | undefined {
    return this.children[0]
  }

  getNextSibling(): OpNode | undefined {
    if (!this.parent) return undefined
    const idx = this.parent.children.indexOf(this)
    return this.parent.children[idx + 1]
  }

  destroy(): void {
    for (const child of this.children) {
      child.destroy()
    }
    this.children = []
    if (this.parent) {
      this.parent.remove(this)
    }
  }
}
```

#### `packages/solid-bindings/src/opnode/ElementOpNode.ts`

```typescript
import { open, close, text, type Op } from "clayterm"
import { toSizingAxis } from "../render"
import { OpNode } from "./OpNode"

export class ElementOpNode extends OpNode {
  constructor(type: string, id: string) {
    super(type, id)
  }

  toOps(): Op[] {
    const ops: Op[] = []

    if (this.type === "text") {
      // Text elements emit text ops for their children
      const content = this.children
        .filter((c): c is TextOpNode => c instanceof TextOpNode)
        .map((c) => c.value)
        .join("")
      ops.push(text(content, { color: this.props.color as any }))
    } else if (this.type === "box") {
      const openProps = this.buildBoxProps()
      ops.push(open(this.id, openProps))
      for (const child of this.children) {
        ops.push(...child.toOps())
      }
      ops.push(close())
    } else {
      // Generic element
      ops.push(open(this.id, this.props as any))
      for (const child of this.children) {
        ops.push(...child.toOps())
      }
      ops.push(close())
    }

    return ops
  }

  private buildBoxProps(): Record<string, unknown> {
    const props = this.props as any
    const openProps: any = {}

    if (props.width || props.height || props.direction || 
        props.padding || props.gap || props.alignX || props.alignY) {
      openProps.layout = {}
      if (props.width) openProps.layout.width = toSizingAxis(props.width)
      if (props.height) openProps.layout.height = toSizingAxis(props.height)
      if (props.direction) openProps.layout.direction = props.direction
      if (props.padding) openProps.layout.padding = props.padding
      if (props.gap !== undefined) openProps.layout.gap = props.gap
      if (props.alignX !== undefined) openProps.layout.alignX = props.alignX
      if (props.alignY !== undefined) openProps.layout.alignY = props.alignY
    }

    if (props.bg !== undefined) openProps.bg = props.bg
    if (props.border) openProps.border = props.border
    if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius

    return openProps
  }
}
```

#### `packages/solid-bindings/src/opnode/TextOpNode.ts`

```typescript
import { text, type Op } from "clayterm"
import { OpNode } from "./OpNode"

export class TextOpNode extends OpNode {
  value: string

  constructor(id: string, value: string) {
    super("text-node", id)
    this.value = value
  }

  toOps(): Op[] {
    // Text nodes don't emit their own ops
    // They're collected by parent text elements
    return []
  }

  replace(value: string): void {
    if (this.value !== value) {
      this.value = value
      this.markDirty()
    }
  }
}
```

#### `packages/solid-bindings/src/opnode/SlotOpNode.ts`

```typescript
import { OpNode } from "./OpNode"
import { TextOpNode } from "./TextOpNode"
import { ElementOpNode } from "./ElementOpNode"

/**
 * SlotOpNode is a placeholder for conditional content.
 * Used by Show, Switch, For components.
 * 
 * It's invisible (no layout impact) and swaps between content states.
 */
export class SlotOpNode extends OpNode {
  private layoutSlot?: LayoutSlotOpNode
  private textSlot?: TextSlotOpNode

  constructor(id: string) {
    super("slot", id)
  }

  toOps(): Op[] {
    // Slots don't emit ops directly
    // Their content does
    return []
  }

  /**
   * Get the appropriate slot child based on parent type.
   * Text parents need TextSlotOpNode, layout parents need LayoutSlotOpNode.
   */
  getSlotChild(parent: OpNode): OpNode {
    if (this.isTextParent(parent)) {
      if (!this.textSlot) {
        this.textSlot = new TextSlotOpNode(`${this.id}-text`)
      }
      return this.textSlot
    }

    if (!this.layoutSlot) {
      this.layoutSlot = new LayoutSlotOpNode(`${this.id}-layout`)
    }
    return this.layoutSlot
  }

  private isTextParent(node: OpNode): boolean {
    return node.type === "text" || node instanceof TextOpNode
  }
}

/**
 * LayoutSlotOpNode is invisible in the layout tree.
 * Used for Show/Switch/For inside layout elements (box, etc).
 */
export class LayoutSlotOpNode extends OpNode {
  constructor(id: string) {
    super("layout-slot", id)
  }

  toOps(): Op[] {
    // Invisible - no ops
    return []
  }
}

/**
 * TextSlotOpNode is invisible in text content.
 * Used for Show/Switch/For inside text elements.
 */
export class TextSlotOpNode extends OpNode {
  constructor(id: string) {
    super("text-slot", id)
  }

  toOps(): Op[] {
    // Invisible - no ops
    return []
  }
}
```

#### `packages/solid-bindings/src/opnode/index.ts`

```typescript
export { OpNode } from "./OpNode"
export { ElementOpNode } from "./ElementOpNode"
export { TextOpNode } from "./TextOpNode"
export { SlotOpNode, LayoutSlotOpNode, TextSlotOpNode } from "./SlotOpNode"
```

#### `packages/solid-bindings/src/utils/id-counter.ts`

```typescript
const idCounter = new Map<string, number>()

export function getNextId(elementType: string): string {
  const value = (idCounter.get(elementType) ?? 0) + 1
  idCounter.set(elementType, value)
  return `${elementType}-${value}`
}

export function resetIdCounter(): void {
  // Only for testing - don't call in production
  idCounter.clear()
}
```

---

## Phase 3: Solid Reconciler

### Goal
Implement the reconciler that Solid's `universal.js` expects.

### Files to Create

#### `packages/solid-bindings/src/reconciler/index.ts`

Port opentui's `universal.js` patterns with OpNode-specific implementations.

```typescript
import { createRoot, createRenderEffect, createMemo, createComponent, untrack, mergeProps } from "solid-js"
import { OpNode, ElementOpNode, TextOpNode, SlotOpNode } from "../opnode"
import { getNextId } from "../utils/id-counter"

const memo = (fn: () => any) => createMemo(() => fn())

export interface ReconcilerOptions {
  createElement(tag: string): OpNode
  createTextNode(value: string): TextOpNode
  createSlotNode(): SlotOpNode
  replaceText(node: TextOpNode, value: string): void
  isTextNode(node: OpNode): boolean
  setProperty(node: OpNode, name: string, value: any, prev: any): void
  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void
  removeNode(parent: OpNode, node: OpNode): void
  getParentNode(node: OpNode): OpNode | undefined
  getFirstChild(node: OpNode): OpNode | undefined
  getNextSibling(node: OpNode): OpNode | undefined
}

export interface Reconciler {
  render(code: () => OpNode, root: OpNode): () => void
  effect<T>(fn: (prev?: T) => T, init?: T): void
  memo<T>(fn: () => T, equal: boolean): () => T
  createComponent<T>(Comp: (props: T) => OpNode, props: T): OpNode
  createElement(tag: string): OpNode
  createTextNode(value: string): TextOpNode
  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void
  insert<T>(parent: any, accessor: (() => T) | T, marker?: any, initial?: any): OpNode
  spread<T>(node: any, accessor: (() => T) | T, skipChildren?: boolean): void
  setProp<T>(node: OpNode, name: string, value: T, prev?: T): T
  mergeProps: typeof mergeProps
  use<A, T>(fn: (element: OpNode, arg: A) => T, element: OpNode, arg: A): T
}

export function createReconciler(options: ReconcilerOptions): Reconciler {
  // ... port universal.js logic here
  // Key functions: insert, insertExpression, reconcileArrays, cleanChildren
}
```

#### `packages/solid-bindings/src/reconciler/defaults.ts`

Default reconciler implementation for clayterm:

```typescript
import { OpNode, ElementOpNode, TextOpNode, SlotOpNode, TextSlotOpNode, LayoutSlotOpNode } from "../opnode"
import { getNextId } from "../utils/id-counter"
import type { ReconcilerOptions } from "./index"

export const defaultReconcilerOptions: ReconcilerOptions = {
  createElement(tag: string): OpNode {
    const id = getNextId(tag)
    return new ElementOpNode(tag, id)
  },

  createTextNode(value: string): TextOpNode {
    const id = getNextId("text-node")
    return new TextOpNode(id, value)
  },

  createSlotNode(): SlotOpNode {
    const id = getNextId("slot")
    return new SlotOpNode(id)
  },

  replaceText(node: TextOpNode, value: string): void {
    node.replace(value)
  },

  isTextNode(node: OpNode): boolean {
    return node instanceof TextOpNode
  },

  setProperty(node: OpNode, name: string, value: any, prev: any): void {
    if (name.startsWith("on:")) {
      // Event handler - store in props
      node.props[name] = value
      return
    }

    if (node instanceof ElementOpNode) {
      if (value === undefined) {
        delete node.props[name]
      } else {
        node.props[name] = value
      }
      node.markDirty()
    }
  },

  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void {
    // Handle slot nodes
    if (node instanceof SlotOpNode) {
      node.parent = parent
      node = node.getSlotChild(parent)
    }

    if (anchor instanceof SlotOpNode) {
      anchor = anchor.getSlotChild(parent)
    }

    if (anchor) {
      parent.insertBefore(node, anchor)
    } else {
      parent.add(node)
    }
  },

  removeNode(parent: OpNode, node: OpNode): void {
    if (node instanceof SlotOpNode) {
      node.parent = null
      // Don't remove slot content - it will be reused
      return
    }
    parent.remove(node)
  },

  getParentNode(node: OpNode): OpNode | undefined {
    return node.parent ?? undefined
  },

  getFirstChild(node: OpNode): OpNode | undefined {
    return node.getFirstChild()
  },

  getNextSibling(node: OpNode): OpNode | undefined {
    return node.getNextSibling()
  },
}
```

---

## Phase 4: Runtime Integration

### Goal
Update the runtime to use the persistent tree.

### Files to Modify

#### `packages/solid-bindings/src/runtime.ts`

Key changes:
1. Create root OpNode once (not each frame)
2. Use reconciler's `render()` for initial setup
3. On signal changes, only re-emit ops from dirty nodes

```typescript
import { createInput, type InputEvent, type PointerEvent, type Op } from "clayterm"
import { Renderer } from "@tui/core"
import { OpNode, ElementOpNode } from "./opnode"
import { createReconciler, defaultReconcilerOptions } from "./reconciler"

export interface AppOptions {
  width?: number
  height?: number
}

export interface AppContext {
  width: number
  height: number
  pointer: { x: number; y: number; down: boolean }
  sendOps: (ops: Op[]) => void
}

export type AppView = (ctx: AppContext) => OpNode

export async function runApp(view: AppView, options: AppOptions = {}): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? 80
  const height = options.height ?? process.stdout.rows ?? 24

  const renderer = new Renderer({ width, height })
  await renderer.init()
  const input = await createInput()

  // Create persistent root
  const rootOpNode = new ElementOpNode("root", "root")
  
  // Create reconciler
  const reconciler = createReconciler(defaultReconcilerOptions)
  
  // Initial render
  let disposer = reconciler.render(() => view({ width, height, pointer, sendOps }), rootOpNode)

  let pointer = { x: -1, y: -1, down: false }
  let cleanedUp = false

  function frame() {
    if (cleanedUp) return

    // Collect ops from dirty nodes only (or full tree if needed)
    const ops = collectOps(rootOpNode)
    
    // Clear dirty flags
    clearDirty(rootOpNode)

    const output = renderer.render(ops, pointer)
    process.stdout.write(output)
  }

  function collectOps(node: OpNode): Op[] {
    const ops: Op[] = []
    collectOpsRecursive(node, ops)
    return ops
  }

  function collectOpsRecursive(node: OpNode, ops: Op[]): void {
    ops.push(...node.toOps())
  }

  function clearDirty(node: OpNode): void {
    node.markClean()
    for (const child of node.children) {
      clearDirty(child)
    }
  }

  // ... rest of runtime (input handling, cleanup, etc.)
}
```

---

## Phase 5: Testing

### Goal
Port opentui's tests and add new tests for clayterm-specific behavior.

### Test Files to Create

#### `packages/solid-bindings/test/reconciler.test.ts`

Port opentui's reconciler tests:
- Array reconciliation (LIS algorithm)
- Slot handling for Show/Switch/For
- Property updates
- Node insertion/removal

#### `packages/solid-bindings/test/focus-preservation.test.ts`

Test that focus is preserved across renders:
- Click to focus
- Focus maintained when other props change
- Focus lost when element removed

#### `packages/solid-bindings/test/control-flow.test.ts`

Test Solid's control flow components:
- Show toggles content correctly
- For renders list items with stable IDs
- Switch/Match works correctly

---

## Edge Cases to Handle

From opentui's tests, we need to handle:

### 1. Destroy Race Conditions
```typescript
// Check isDestroyed after every user callback
if (node.isDestroyed) return
userCallback()
if (node.isDestroyed) return  // Check again!
```

### 2. Slot Parent Identity
```typescript
// Slots need to return correct parent for identity checks
getSlotChild(parent: OpNode): OpNode {
  // Return appropriate slot type based on parent
}
```

### 3. Text Node Parent Validation
```typescript
// Text nodes must have text parent
if (node instanceof TextOpNode) {
  if (!(parent.type === "text")) {
    throw new Error("Text nodes must have text parent")
  }
}
```

### 4. For Component Identity
```typescript
// For must return same object reference for same item
// Use a Map to cache rendered items
const itemCache = new Map<string, OpNode>()
```

---

## Migration Checklist

- [ ] Phase 1: Clayterm ID fix
  - [ ] Edit clayterm.c
  - [ ] Rebuild WASM
  - [ ] Run existing tests
  - [ ] Test focus/click behavior

- [ ] Phase 2: OpNode tree
  - [ ] Create OpNode base class
  - [ ] Create ElementOpNode
  - [ ] Create TextOpNode
  - [ ] Create SlotOpNode variants
  - [ ] Create id-counter utility
  - [ ] Unit tests for OpNode classes

- [ ] Phase 3: Reconciler
  - [ ] Port universal.js patterns
  - [ ] Implement ReconcilerOptions
  - [ ] Handle all Solid control flow
  - [ ] Unit tests for reconciler

- [ ] Phase 4: Runtime integration
  - [ ] Update runtime.ts
  - [ ] Update Renderer class
  - [ ] Handle dirty tracking
  - [ ] Integration tests

- [ ] Phase 5: Testing
  - [ ] Port opentui reconciler tests
  - [ ] Add focus preservation tests
  - [ ] Add control flow tests
  - [ ] Blackbox tests

- [ ] Cleanup
  - [ ] Remove old virtual DOM code
  - [ ] Remove old Renderable tree code
  - [ ] Update AGENTS.md
  - [ ] Update package exports
