## Solid Runtime Resolution Under Bun

`@tui/solid-bindings` compiles JSX with `babel-preset-solid` using `generate: "universal"`.
That is correct for this package because we reconcile into a clayterm OpNode tree instead of the DOM.

However, the JSX transform target is separate from how Bun resolves `import "solid-js"` at runtime.

### The problem

Solid 2.0 publishes multiple runtime entrypoints behind package export conditions:

- `solid-js/dist/server.js`: SSR/server runtime
- `solid-js/dist/solid.js`: live reactive runtime

When Bun runs in CLI mode, it resolves `solid-js` using the `node` condition, which selects `dist/server.js`.

That server runtime is designed for one-shot SSR. It exports the same primitive names, but its reactive behavior is intentionally stubbed for server rendering:

- `createSignal` stores values but does not drive a live dependency graph
- `createEffect` and `createRenderEffect` run once instead of re-running from signal updates
- `createMemo` computes once instead of participating in normal invalidation

This was mostly invisible in the old runtime because the app rebuilt from `view()` every frame. A signal write could still be observed on the next full render.

With ADR 0013's persistent OpNode tree, the app mounts once and expects Solid to push in-place updates into the existing tree. That requires Solid's live runtime.

### The fix

We follow the same approach as `@opentui/solid`.

Our Bun preload plugin intercepts loads of `solid-js/dist/server.js` and replaces the module contents with `solid-js/dist/solid.js`:

```ts
build.onLoad({ filter: /[/\\]node_modules[/\\]solid-js[/\\]dist[/\\]server\.js(?:[?#].*)?$/ }, async (args) => {
  const path = sourcePath(args.path).replace("server.js", "solid.js")
  const file = Bun.file(path)
  const code = await file.text()
  return { contents: code, loader: "js" }
})
```

Mechanically, this means:

1. Bun resolves `import "solid-js"` to `dist/server.js`
2. The preload plugin sees that resolved path during module loading
3. The plugin returns the contents of `dist/solid.js` instead
4. The app still imports `solid-js` normally, but executes the live runtime

### Why not rewrite imports or use a shim?

Earlier experiments rewrote imports to a package-local shim that re-exported `solid-js/dist/solid.js` directly.
That worked, but it mixed a runtime-resolution workaround into the public API surface and source imports.

The preload remap is cleaner because:

- source files keep importing `solid-js` normally
- package exports stay simple
- the workaround lives where the problem actually occurs: Bun's runtime module loading

### Why this is not a browser hack

We do not need DOM APIs.
We need Solid's live reactive runtime.

`generate: "universal"` still targets a custom reconciler.
The preload remap only changes which Solid runtime implementation executes under Bun.
