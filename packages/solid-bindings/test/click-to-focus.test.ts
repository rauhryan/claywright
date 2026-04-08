import { describe, expect, test } from "bun:test";
import { Renderer, MouseEvent } from "@tui/core";
import { ElementNode } from "../src/jsx-runtime";
import { createRenderableTree } from "../src/renderable-tree";

describe("click-to-focus integration", () => {
  test("clicking focusable element triggers focus", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    let focusCalled = false;

    const vnode = new ElementNode("box", "box-test");
    vnode.props.focusable = true;
    vnode.props.onFocus = () => {
      focusCalled = true;
    };

    const renderable = createRenderableTree(vnode);
    if (!renderable) throw new Error("Failed to create renderable");

    renderer.setRoot(renderable);

    (renderer as any).handlePointerEvent({
      type: "pointerclick",
      id: vnode.id,
      x: 10,
      y: 10,
      button: 0,
      shift: false,
      alt: false,
      ctrl: false,
    });

    expect(focusCalled).toBe(true);
    expect(renderer.focusedRenderable).toBe(renderable);
    expect(renderable.focused).toBe(true);

    renderer.destroy();
  });

  test("preventDefault prevents focus", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const vnode = new ElementNode("box", "box-test-2");
    vnode.props.focusable = true;
    vnode.props.onClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    const renderable = createRenderableTree(vnode);
    if (!renderable) throw new Error("Failed to create renderable");

    renderer.setRoot(renderable);

    (renderer as any).handlePointerEvent({
      type: "pointerclick",
      id: vnode.id,
      x: 10,
      y: 10,
      button: 0,
      shift: false,
      alt: false,
      ctrl: false,
    });

    expect(renderer.focusedRenderable).toBe(null);
    expect(renderable.focused).toBe(false);

    renderer.destroy();
  });
});
