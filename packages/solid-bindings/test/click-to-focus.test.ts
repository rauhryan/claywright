import { test, expect, describe } from "bun:test";
import { Renderer, Renderable, MouseEvent } from "@tui/core";
import { ElementNode } from "../src/jsx-runtime";
import { ElementRenderable } from "../src/ElementRenderable";
import { createRenderableTree } from "../src/reconciler";

describe("click-to-focus integration", () => {
  test("clicking focusable element triggers focus", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    let focusCalled = false;
    let blurCalled = false;

    const vnode = new ElementNode("box");
    vnode.props.focusable = true;
    vnode.props.onFocus = () => {
      focusCalled = true;
    };
    vnode.props.onBlur = () => {
      blurCalled = true;
    };

    const renderable = createRenderableTree(vnode);
    if (!renderable) throw new Error("Failed to create renderable");

    renderer.setRoot(renderable);

    // Simulate click event from clayterm
    const clickEvent = {
      type: "pointerclick",
      id: vnode.id,
      x: 10,
      y: 10,
      button: 0,
      shift: false,
      alt: false,
      ctrl: false,
    };

    // Access private method for testing
    (renderer as any).handlePointerEvent(clickEvent);

    expect(focusCalled).toBe(true);
    expect(renderer.focusedRenderable).toBe(renderable);
    expect(renderable.focused).toBe(true);

    renderer.destroy();
  });

  test("clicking non-focusable element does not trigger focus", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const vnode = new ElementNode("box");
    // No focusable prop

    const renderable = createRenderableTree(vnode);
    if (!renderable) throw new Error("Failed to create renderable");

    renderer.setRoot(renderable);

    const clickEvent = {
      type: "pointerclick",
      id: vnode.id,
      x: 10,
      y: 10,
      button: 0,
      shift: false,
      alt: false,
      ctrl: false,
    };

    (renderer as any).handlePointerEvent(clickEvent);

    expect(renderer.focusedRenderable).toBe(null);
    expect(renderable.focused).toBe(false);

    renderer.destroy();
  });

  test("preventDefault prevents focus", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const vnode = new ElementNode("box");
    vnode.props.focusable = true;
    vnode.props.onClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    const renderable = createRenderableTree(vnode);
    if (!renderable) throw new Error("Failed to create renderable");

    renderer.setRoot(renderable);

    const clickEvent = {
      type: "pointerclick",
      id: vnode.id,
      x: 10,
      y: 10,
      button: 0,
      shift: false,
      alt: false,
      ctrl: false,
    };

    (renderer as any).handlePointerEvent(clickEvent);

    expect(renderer.focusedRenderable).toBe(null);
    expect(renderable.focused).toBe(false);

    renderer.destroy();
  });
});
