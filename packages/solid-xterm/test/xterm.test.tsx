/** @jsxImportSource @tui/solid-xterm */

import { createSignal, flush } from "solid-js/dist/solid.js";
import { describe, expect, it } from "bun:test";
import { Terminal } from "@xterm/headless";
import { render, RootNode, renderToString, ElementNode } from "../jsx-runtime.ts";

describe("solid-xterm with VirtualTerminal", () => {
  it("renders to terminal", async () => {
    const term = new Terminal({ cols: 20, rows: 5 });
    const root = new RootNode();

    render(() => (
      <box>
        <text>Hello Terminal</text>
      </box>
    ), root);

    const output = renderToString(root);
    expect(output).toBe("<box><text>Hello Terminal</text></box>");
  });

  it("updates terminal on signal change", async () => {
    const term = new Terminal({ cols: 20, rows: 5 });
    const root = new RootNode();
    const [count, setCount] = createSignal(0);

    render(() => (
      <box>
        <text>Count: {count()}</text>
      </box>
    ), root);

    expect(renderToString(root)).toBe("<box><text>Count: 0</text></box>");

    setCount(42);
    flush();
    expect(renderToString(root)).toBe("<box><text>Count: 42</text></box>");
  });

  it("supports nested elements", async () => {
    const root = new RootNode();

    render(() => (
      <box id="outer">
        <box id="inner">
          <text>Nested</text>
        </box>
      </box>
    ), root);

    const output = renderToString(root);
    expect(output).toBe("<box><box><text>Nested</text></box></box>");

    const outer = root.children[0] as ElementNode;
    expect(outer.props.id).toBe("outer");
    
    const inner = outer.children[0] as ElementNode;
    expect(inner.props.id).toBe("inner");
  });
});
