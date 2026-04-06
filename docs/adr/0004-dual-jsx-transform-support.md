# ADR 0004: Dual JSX Transform Support

## Context

We need JSX to work in two contexts:

1. **Test runner**: Uses babel-preset-solid via a preload plugin
2. **Spawned fixtures**: Tests spawn `bun test/fixtures/hello.tsx` as a subprocess

The problem: Babel preload only works for the test runner process, not for spawned subprocesses. When a test spawns a fixture, that fixture runs without the babel transform.

Bun has a built-in JSX transform that expects different exports:

- `jsx(type, props)` / `jsxs(type, props)` / `jsxDEV(type, props, key, isStatic, source, self)`

babel-preset-solid generates different code:

- `createElement(tag)`, `insertNode(parent, node)`, `createTextNode(text)`, etc.

Both need to produce the same virtual DOM structure.

## Decision

We will support **both JSX transform paths**:

1. **Bun's built-in JSX**: Used when running `.tsx` files directly (e.g., spawned fixtures)
2. **babel-preset-solid**: Used in test context via preload plugin

Both are exported from `jsx-runtime.ts` and produce the same ElementNode/TextNode structure.

## Status

Accepted.

## Consequences

**Positive:**

- Fixtures run standalone without preload plugin
- Tests work with babel-preset-solid
- Both transforms produce identical virtual DOM
- No special configuration needed for either path

**Negative:**

- Must export both sets of functions from jsx-runtime
- Slight code duplication in exports
- Two code paths to maintain and test

**Neutral:**

- Bun's JSX transform is faster (no babel overhead)
- babel-preset-solid is more configurable
- Both are valid choices for production use
