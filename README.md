# claywright

Terminal UI experiments around `clayterm`, with a blackbox test harness powered by `ghostty-vt`.

## What is here

- `packages/ghostty-vt`: Bun FFI bindings to `libghostty-vt` plus mouse helpers and screen inspection
- `packages/test-harness`: blackbox testing utilities for spawning TUIs, sending input, and asserting rendered output
- `packages/solid-bindings`: Solid.js 2.0 JSX bindings that compile to clayterm operations
- `packages/clayterm-examples`: runnable example apps used to exercise interaction and animation behavior
- `packages/clayterm`: vendored git submodule for the renderer/runtime being exercised

## Quick start

Requirements:

- Bun
- macOS with the Ghostty dynamic libraries available in `packages/ghostty-vt/lib`
- `make` and `deno` for rebuilding the `clayterm` npm artifact

Install dependencies:

```bash
bun install
```

Build the vendored `clayterm` artifact:

```bash
bun run build:clayterm
```

Run the example CLI:

```bash
bun run examples:list
bun run examples modal-menu
```

Run tests:

```bash
bun test packages/ghostty-vt packages/solid-bindings packages/test-harness packages/clayterm-examples
```

Or run the full workspace test flow:

```bash
bun test
```

## How the Ghostty test harness works

The test stack is split in two layers:

1. `@tui/ghostty-vt` emulates a terminal screen in-process
2. `@tui/test-harness` spawns a real CLI process, feeds it keyboard and mouse input, and inspects the emulated screen

This gives you blackbox tests for terminal UIs without snapshotting raw stdout blindly.

### `@tui/ghostty-vt`

The Ghostty wrapper in `packages/ghostty-vt/src/index.ts` exposes:

- `createTerminal()` / `GhosttyTerminal` for VT emulation
- `getScreen()` for rendered text output
- `getCell()` and `getCellStyle()` for cell-level assertions
- `isAltScreen()` and `getMouseTrackingMode()` for mode checks
- `MouseEncoder` and `MouseEvent` for generating real mouse escape sequences

The wrapper loads:

- `packages/ghostty-vt/lib/libghostty-vt.dylib`
- `packages/ghostty-vt/lib/libghostty-wrapper.dylib`

If you need to rebuild the wrapper library:

```bash
bun run --cwd packages/ghostty-vt build
```

If you need to rebuild the underlying Ghostty VT library:

```bash
bun run --cwd packages/ghostty-vt rebuild:ghostty
```

### `@tui/test-harness`

`packages/test-harness/src/index.ts` provides `TerminalSession`, which wraps a `GhosttyTerminal` and a spawned subprocess.

Key capabilities:

- `spawn(command, args)` to run a CLI under test
- `sendKey()`, `write()` for keyboard input
- `mouseMove()`, `mouseDown()`, `mouseUp()`, `click()`, `drag()` for pointer input
- `getScreen()`, `findText()`, `containsText()` for text assertions
- `getCell()`, `getCellStyle()`, `matchesStyle()` for cell/style assertions
- `captureStyles()` + `getStyleChanges()` for hover/selection diffs
- `getChangedCells()` for detecting visual changes between frames
- `startVTCapture()` + `getVTSequences()` for inspecting escape sequences

The harness sets `TERM`, `COLUMNS`, and `LINES` for the child process so the app renders into a predictable viewport.

## Writing a blackbox test

Most tests follow this shape:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createSession, type TerminalSession } from "../../test-harness/src/index";

const fixture = new URL("../src/examples/modal-menu.ts", import.meta.url).pathname;

describe("modal menu", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = createSession({ cols: 70, rows: 20, cwd: process.cwd() });
  });

  afterEach(() => {
    session.cleanup();
  });

  it("opens from keyboard", async () => {
    await session.spawn("bun", [fixture]);
    expect(await session.waitForText("Palette closed", 2000)).toBe(true);

    session.sendKey("/");
    expect(await session.waitForText("Command Palette", 2000)).toBe(true);
  });
});
```

Useful patterns from the existing suite:

- text assertions: `packages/clayterm-examples/test/examples.blackbox.test.ts`
- hover/click assertions: `packages/clayterm-examples/test/carousel.blackbox.test.ts`
- VT and style inspection: `packages/test-harness/test/session.test.ts`
- clayterm blackbox fixtures: `packages/test-harness/test/clayterm-blackbox.test.ts`

## Common testing patterns

### Assert visible text

```ts
expect(await session.waitForText("Idle", 2000)).toBe(true);
expect(session.containsText("Open Menu")).toBe(true);
```

### Click a rendered button

```ts
const button = session.findText("Next");
session.mouseMove(button!.col + 2, button!.row);
await session.wait(120);
session.mouseDown(button!.col + 2, button!.row);
await session.wait(50);
session.mouseUp(button!.col + 2, button!.row);
```

### Detect hover style changes

```ts
const before = session.captureStyles([{ col: 10, row: 5 }]);
session.mouseMove(10, 5);
await session.wait(120);
expect(session.getStyleChanges(before).length).toBeGreaterThan(0);
```

### Assert selection or inverse styling

```ts
expect(session.matchesStyle(0, 0, { inverse: true })).toBe(true);
session.assertSelection(0, 0, 4, 0);
```

### Inspect exact cell content

```ts
const cell = session.getCell(1, 0);
expect(cell.text).toBe("B");
```

### Capture raw VT sequences

```ts
session.startVTCapture();
session.click(5, 3);
const sequences = session.getVTSequences();
expect(sequences.length).toBeGreaterThan(0);
```

## Running the current examples

Available example entry points include:

- `basic-button`
- `selection`
- `carousel-track`
- `carousel-floating`
- `carousel-transition`
- `modal-menu`

Examples can be run either through the shared CLI:

```bash
bun run examples modal-menu
```

or with direct root shortcuts:

```bash
bun run example:modal-menu
```

## Notes

- The repo currently publishes as a monorepo with `packages/clayterm` tracked as a git submodule.
- `clayterm` import resolution inside the workspace is driven by `tsconfig.json` path aliases to `packages/clayterm/build/npm/esm/*`.
- The example runtime in `packages/clayterm-examples/src/runtime.ts` handles raw mode, mouse tracking, redraws, transitions, and delayed ESC flushes for interactive tests.
