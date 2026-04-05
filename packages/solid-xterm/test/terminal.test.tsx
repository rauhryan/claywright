/** @jsxImportSource @tui/solid-xterm */

import { createSignal, flush } from "solid-js/dist/solid.js";
import { describe, expect, it } from "bun:test";
import { render, RootNode } from "../jsx-runtime.ts";
import { VirtualTerminal } from "./vt.ts";
import { renderToTerminal } from "./renderer.ts";

describe("terminal rendering", () => {
  it("renders text to terminal screen", async () => {
    const vt = new VirtualTerminal(20, 5);
    const root = new RootNode();

    render(() => (
      <text>Hello</text>
    ), root);

    await renderToTerminal(root, vt);
    const screen = vt.getScreen();
    expect(screen).toBe("Hello");
  });

  it("renders multiple lines", async () => {
    const vt = new VirtualTerminal(20, 5);
    const root = new RootNode();

    render(() => (
      <box>
        <text>Line 1</text>
        <text>Line 2</text>
      </box>
    ), root);

    await renderToTerminal(root, vt);
    const screen = vt.getScreen();
    expect(screen).toBe("Line 1\nLine 2");
  });

  it("renders with position", async () => {
    const vt = new VirtualTerminal(20, 5);
    const root = new RootNode();

    render(() => (
      <text x={5} y={2}>Hello</text>
    ), root);

    await renderToTerminal(root, vt);
    const screen = vt.getScreen();
    expect(vt.getLine(2)).toBe("     Hello");
  });

  it("updates on signal change", async () => {
    const vt = new VirtualTerminal(20, 5);
    const root = new RootNode();
    const [count, setCount] = createSignal(0);

    render(() => (
      <text>Count: {count()}</text>
    ), root);

    await renderToTerminal(root, vt);
    expect(vt.getScreen()).toBe("Count: 0");

    setCount(42);
    flush();
    await renderToTerminal(root, vt);
    expect(vt.getScreen()).toBe("Count: 42");
  });
});
