/** @jsxImportSource @tui/solid-xterm */

import { createSignal, flush } from "solid-js/dist/solid.js";
import { describe, expect, it } from "bun:test";
import { render, renderToString, RootNode } from "../jsx-runtime.ts";

describe("solid-xterm JSX", () => {
  it("renders static JSX", () => {
    const root = new RootNode();
    render(() => (
      <box>
        <text>Hello World</text>
      </box>
    ), root);
    expect(renderToString(root)).toBe("<box><text>Hello World</text></box>");
  });

  it("renders reactive JSX", () => {
    const root = new RootNode();
    const [message, setMessage] = createSignal("Hello");

    render(() => (
      <box>
        <text>{message()}</text>
      </box>
    ), root);

    expect(renderToString(root)).toBe("<box><text>Hello</text></box>");

    setMessage("World");
    flush();
    expect(renderToString(root)).toBe("<box><text>World</text></box>");
  });

  it("renders with props", () => {
    const root = new RootNode();

    render(() => (
      <box id="my-box" color="blue">
        <text>Content</text>
      </box>
    ), root);

    const box = root.children[0];
    expect(box).toBeDefined();
    if (box && "props" in box) {
      expect(box.props.id).toBe("my-box");
      expect(box.props.color).toBe("blue");
    }
  });
});
