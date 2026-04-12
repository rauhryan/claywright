# VHS tapes for unified virtual viewport review

These `.tape` files are intended to generate reviewer-facing GIFs for the unified virtual viewport work.

The current tapes intentionally use longer pauses and slower interaction beats so state transitions are easier to inspect during review.

Install dependencies on macOS with Homebrew:

```sh
brew install vhs
```

This installs `vhs` plus its runtime dependencies (`ffmpeg` and `ttyd`).

Typical usage:

```sh
cd claywright
bun run evidence:vhs:list
bun run evidence:vhs:check
bun run evidence:vhs
```

You can also render a subset:

```sh
cd claywright
bun run evidence:vhs virtual-viewport-track virtual-viewport-prepared-text
```

Suggested outputs:
- `evidence/gifs/text-stream-scroll.gif`
- `evidence/gifs/virtual-viewport-auto-follow.gif`
- `evidence/gifs/virtual-viewport-track.gif`
- `evidence/gifs/virtual-viewport-budget.gif`
- `evidence/gifs/virtual-viewport-geometry.gif`
- `evidence/gifs/virtual-viewport-large-history.gif`
- `evidence/gifs/virtual-viewport-prepared-text.gif`
- `evidence/gifs/virtual-viewport-transcript-collapse.gif`

HTML gallery:
- `evidence/index.html`
