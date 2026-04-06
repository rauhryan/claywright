import { describe, expect, test } from "bun:test";
import { Renderer } from "@tui/core";
import { RootNode, jsx } from "../src/jsx-runtime";
import { createRenderableTree } from "../src/reconciler";

describe("input focus integration", () => {
  test("pointer clicks focus input through renderable tree", async () => {
    let focused = false;

    const root = new RootNode();
    const input = jsx("input", {
      onFocus: () => {
        focused = true;
      },
      placeholder: "Type here",
    });
    const inner = jsx("box", { children: input });
    const outer = jsx("box", { children: inner });

    root.children.push(outer);
    outer.parent = root;

    const renderable = createRenderableTree(root);
    if (!renderable) {
      throw new Error("expected renderable tree");
    }

    const renderer = new Renderer({ height: 10, width: 40 });
    await renderer.init();
    renderer.setRoot(renderable);

    (renderer as any).handlePointerEvent({ id: outer.id, type: "pointerclick" });

    expect(focused).toBe(true);
    expect(renderer.focusedRenderable?.id).toBe(input.id);
    renderer.destroy();
  });
});
