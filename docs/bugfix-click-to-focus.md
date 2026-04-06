# Bug Fix: Click-to-Focus Not Working

## Problem

Clicking on focusable elements did nothing - no visual feedback, no focus change.

## Root Causes

### 1. Missing Pointer Position (Critical Bug)

**File:** `packages/core/src/Renderer.ts:74`

**Before:**
```typescript
const { output, events } = this.term.render(ops)  // ❌ Missing pointer
```

**After:**
```typescript
const { output, events } = this.term.render(ops, { pointer })  // ✅ Pass pointer
```

**Why it matters:**
- Clayterm needs pointer position to generate click/hover events
- Without it, clayterm never sends pointer events to Renderer
- So clicking did nothing

**Also updated:**
- `runtime.ts` to pass pointer to `renderer.render(ops, pointer)`
- `sendOps()` to also pass pointer

### 2. Event Handler Getters Not Working (TypeScript Issue)

**File:** `packages/solid-bindings/src/ElementRenderable.ts`

**Problem:**
- Parent class `Renderable` has `onFocus?: () => void` as a property
- Child class `ElementRenderable` tried to override with getters
- TypeScript/JavaScript doesn't properly override parent properties with child getters
- Result: getters returned `undefined` even though `node.props.onFocus` was set

**Solution:**
Use `Object.defineProperty` in constructor to dynamically set getters:
```typescript
constructor(node: ElementNode) {
  super({ id: node.id, focusable: node.props.focusable as boolean | undefined })
  this.node = node
  
  const handlers = ['onClick', 'onMouseDown', 'onMouseUp', 'onMouseMove',
                    'onKeyDown', 'onKeyUp', 'onPaste', 'onFocus', 'onBlur']
  
  for (const handler of handlers) {
    Object.defineProperty(this, handler, {
      get: () => this.node.props[handler],
      enumerable: true,
      configurable: true
    })
  }
}
```

## Test Results

**Before fix:** 36 tests passing, clicking did nothing
**After fix:** 39 tests passing, click-to-focus works

**New tests added:**
- `click-to-focus.test.ts` - 3 tests verifying focus behavior
  - Clicking focusable element triggers focus
  - Clicking non-focusable element does nothing
  - `preventDefault()` prevents focus

## What Now Works

✅ Clicking on focusable elements triggers focus
✅ `onFocus` and `onBlur` handlers are called
✅ `preventDefault()` prevents auto-focus
✅ Event bubbling through Renderable tree
✅ All existing tests still pass

## Demo

Run `focus-demo.tsx` to see it in action:
```bash
cd tui-monorepo/packages/solid-bindings
bun focus-demo.tsx
```

**What you'll see:**
1. Blue box with "Click to focus"
2. Click the box → turns green, shows "FOCUSED"
3. Click elsewhere → turns back to blue

## Files Changed

1. `packages/core/src/Renderer.ts` - Accept pointer parameter
2. `packages/solid-bindings/src/runtime.ts` - Pass pointer to renderer
3. `packages/solid-bindings/src/ElementRenderable.ts` - Fix event handler getters
4. `packages/solid-bindings/test/click-to-focus.test.ts` - New tests

## Lessons Learned

1. **Always pass context to renderers** - Clayterm needs pointer position to generate events
2. **TypeScript getter/property override is tricky** - Use `Object.defineProperty` for dynamic getters
3. **Test the integration, not just units** - Unit tests passed but integration was broken
