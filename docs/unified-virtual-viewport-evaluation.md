# Unified Virtual Viewport Evaluation Guide

This guide gives a concrete checklist for manually validating the current implementation work.

## 1. Build the Clayterm WASM

```sh
cd claywright/packages/clayterm
make
```

The Makefile defaults to `zig cc` + `wasm-ld`, which works on macOS systems where Apple clang does not ship a `wasm32` target.

## 1.1 Verify the Ghostty VT dylibs for blackbox tests

The blackbox terminal-session tests depend on the Ghostty wrapper libraries living at:

- `claywright/packages/ghostty-vt/lib/libghostty-vt.dylib`
- `claywright/packages/ghostty-vt/lib/libghostty-wrapper.dylib`

If those files are missing, blackbox tests will fail before your viewport code runs.

## 2. Run the automated checks

### Clayterm Deno-style tests
```sh
cd claywright/packages/clayterm
deno task test
```

### Clayterm Bun-only geometry/text-core tests
```sh
cd claywright/packages/clayterm
deno task test:bun
```

### Clayterm built-artifact test
```sh
cd claywright/packages/clayterm
deno task build:npm 0.0.0-dev
deno task test:bun:artifacts
```

### Solid viewport conformance / track tests
```sh
cd claywright
bun test packages/solid-bindings/test/cross-layer-conformance.test.ts
bun test packages/solid-bindings/test/virtual-viewport-track.test.ts
```

### Solid viewport blackbox checks
```sh
cd claywright
bun test packages/solid-bindings/test/virtual-viewport-auto-follow.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-budget.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-geometry.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-large-history.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-prepared-text.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-track.blackbox.test.ts
bun test packages/solid-bindings/test/virtual-viewport-transcript-collapse.blackbox.test.ts
```

## 3. Run the interactive demos

### A. Clayterm text-stream scroll demo

```sh
cd claywright/packages/clayterm
deno task demo:scroll
```

Controls:
- `wheel up/down` — scroll by a few rows
- `PageUp` / `PageDown` — page scroll
- `Home` / `End` — jump to top or bottom
- `q` — quit

What to verify:
- wrapped rows scroll cleanly
- ANSI-bearing rows wrap as visible text, not raw escape bytes
- gutter line numbers remain aligned
- the scroll thumb moves as the viewport moves
- resize reflows content without corruption

### B. Solid VirtualViewport auto-follow fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-auto-follow.tsx
```

What to verify:
- items stream in automatically
- `follow=yes` initially
- wheel up breaks follow mode (`follow=no`)
- `End` restores follow mode (`follow=yes` and `end=yes`)

### C. Solid VirtualViewport scroll-track fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-track.tsx
```

What to verify:
- the state line shows `scroll`, `thumb`, and the last wheel event
- the track thumb is rendered from the viewport scroll model
- wheel or PageDown updates the reported scroll position and thumb pattern

### D. Solid VirtualViewport budget fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-budget.tsx
```

What to verify:
- the state line reports `budget=yes`
- visible rows still render even though the configured budget is too small
- scrolling still works

### E. Solid VirtualViewport geometry fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-geometry.tsx
```

What to verify:
- the state line reports `viewport=<n>` based on the actual parent-constrained viewport size
- the viewport fills the available middle region between header and footer
- scrolling still works with a `grow()` viewport
- resizing the terminal causes the viewport height to re-bootstrap on the next frame

### F. Solid VirtualViewport large-history fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-large-history.tsx
```

What to verify:
- the state line reports a very large `content=` value
- wheel and PageDown remain responsive
- the viewport does not attempt to render all 10,000 rows at once

### G. Solid VirtualViewport prepared-text fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-prepared-text.tsx
```

What to verify:
- wrapped transcript-like blocks are measured through the `clayterm` prepare/layout core
- the visible output shows wrapped multi-row items
- the viewport status line reports a content height larger than the item count when rows wrap

### H. Solid VirtualViewport transcript-collapse fixture

```sh
cd claywright
bun ./packages/solid-bindings/test/fixtures/virtual-viewport-transcript-collapse.tsx
```

What to verify:
- clicking the viewport and pressing `c` collapses the thinking block
- the collapsed summary replaces the expanded wrapped body
- the revision counter can advance while the block remains collapsed
- pressing `c` again re-expands the updated thinking content

## 4. Optional GIF capture

If you have `vhs` installed, you can record the demos for visual review.
On macOS, the easiest setup is:

```sh
brew install vhs
```

That installs `vhs` and its runtime dependencies (`ffmpeg` and `ttyd`).

```sh
cd claywright
bun run evidence:vhs:list
bun run evidence:vhs:check
bun run evidence:vhs
```

You can also render a subset by tape id:

```sh
cd claywright
bun run evidence:vhs virtual-viewport-track virtual-viewport-prepared-text
```

Suggested evidence set:
- `evidence/gifs/text-stream-scroll.gif`
- `evidence/gifs/virtual-viewport-auto-follow.gif`
- `evidence/gifs/virtual-viewport-track.gif`
- `evidence/gifs/virtual-viewport-budget.gif`
- `evidence/gifs/virtual-viewport-geometry.gif`
- `evidence/gifs/virtual-viewport-large-history.gif`
- `evidence/gifs/virtual-viewport-prepared-text.gif`
- `evidence/gifs/virtual-viewport-transcript-collapse.gif`
- `evidence/index.html`

## 5. Reviewer checklist

- [ ] Clayterm WASM builds successfully with `make`
- [ ] `deno task test` passes in `packages/clayterm`
- [ ] `deno task test:bun` passes in `packages/clayterm`
- [ ] `deno task test:bun:artifacts` passes after `build:npm`
- [ ] `cross-layer-conformance.test.ts` passes
- [ ] `virtual-viewport-track.test.ts` passes
- [ ] text-stream scroll demo behaves correctly
- [ ] auto-follow fixture behaves correctly
- [ ] track fixture behaves correctly
- [ ] budget fixture behaves correctly
- [ ] geometry fixture behaves correctly
- [ ] geometry fixture reboots to the correct height after terminal resize
- [ ] large-history fixture behaves correctly
- [ ] prepared-text fixture behaves correctly
- [ ] transcript-collapse fixture behaves correctly
- [ ] optional GIFs captured for visual comparison / design review
