# Focus System Investigation Results

## What We Discovered

### 1. Mouse Events ARE Being Received ✓
- The test harness correctly sends mouse events
- The runtime receives and processes them
- Pointer position is updated correctly

### 2. Clayterm DOES Generate Pointer Events ✓
- When rendering with `pointer: { x, y, down: true }`, clayterm generates:
  - `pointerenter` events
  - `pointerleave` events
  - `pointerclick` events

### 3. The Core Issue: Unstable Element IDs

**Problem:** Element IDs change every frame because:
1. We rebuild the virtual DOM each frame
2. Each rebuild creates new ElementNodes
3. ElementNode IDs are generated with a global counter
4. Counter keeps incrementing, so IDs keep changing

**Example:**
```
Frame 1: el_0, el_1, el_2
Frame 2: el_3, el_4, el_5  (different IDs!)
Frame 3: el_6, el_7, el_8  (different IDs again!)
```

**Why This Breaks Focus:**
- Clayterm tracks elements by ID
- When IDs change, clayterm thinks they're different elements
- Click events are generated on elements that no longer exist
- Focus state is lost because the focused element's ID changed

### 4. Secondary Issue: Focus State Not Preserved

**Problem:** Even if we fix the IDs, focus state is lost because:
1. We rebuild the Renderable tree each frame
2. `Renderer.focusedRenderable` points to an old Renderable instance
3. The old instance is no longer in the tree
4. Focus state is lost

**Current Code:**
```typescript
function frame() {
  const root = new RootNode();
  const node = view({ ... });
  root.children.push(node);
  
  const rootRenderable = createRenderableTree(root);  // New instances!
  renderer.setRoot(rootRenderable);  // Loses focus state
}
```

## What Needs to Be Fixed

### Fix 1: Stable Element IDs

**Option A: Reset ID counter each frame**
```typescript
let frameCounter = 0;
let lastFrame = -1;

function generateId(): string {
  if (lastFrame !== frameCounter) {
    idCounter = 0;
    lastFrame = frameCounter;
  }
  return `el_${idCounter++}`;
}

export function nextFrame() {
  frameCounter++;
}
```

**Pros:** Simple, works for most cases
**Cons:** IDs depend on render order, fragile

**Option B: Use deterministic IDs based on tree position**
```typescript
function generateId(path: string): string {
  return `el_${path}`;
}
```

**Pros:** Truly stable IDs
**Cons:** More complex, need to track tree position

### Fix 2: Preserve Focus State

**Update `Renderer.setRoot()` to preserve focus:**
```typescript
setRoot(renderable: Renderable): void {
  this.renderablesById.clear()
  this.rootRenderable = renderable
  this.buildIdMap(renderable)
  
  // Preserve focus state
  if (this.focusedRenderable) {
    const newFocusedRenderable = this.findRenderable(this.focusedRenderable.id)
    if (newFocusedRenderable) {
      this.focusedRenderable = newFocusedRenderable
    } else {
      this.focusedRenderable = null
    }
  }
}
```

### Fix 3: Render with `pointer.down: true`

**Current issue:** Mouse down and mouse up happen in same input batch, so we never render with `down: true`.

**Fix:** Render immediately on mouse down:
```typescript
if (event.type === "mousedown") {
  pointer = { x: event.x, y: event.y, down: true };
  frame();  // Render immediately with down=true
}
```

### Fix 4: Remove `event.button` Check

Clayterm's `PointerEvent` doesn't have a `button` property, so the check fails:
```typescript
// Wrong:
if (event.type === "pointerclick" && event.button === 0) { ... }

// Correct:
if (event.type === "pointerclick") { ... }
```

## Recommended Implementation Order

1. **Fix stable IDs** (Option A - reset counter)
2. **Fix focus preservation** in `setRoot()`
3. **Fix render on mouse down**
4. **Remove button check**
5. **Test with blackbox test**

## Test Strategy

Create a blackbox test that:
1. Spawns the app
2. Moves mouse to element
3. Clicks on element
4. Verifies visual state changes (text/color)

This will prove the entire focus system works end-to-end.
