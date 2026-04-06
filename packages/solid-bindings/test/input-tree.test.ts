import { describe, expect, test } from "bun:test";
import { createSignal } from "solid-js";
import { RootNode, jsx } from "../src/jsx-runtime";
import { createRenderableTree } from "../src/reconciler";

describe("input renderable tree", () => {
  test("input node becomes a focusable renderable with matching id", () => {
    const root = new RootNode();
    const input = jsx("input", { placeholder: "Type here" });

    root.children.push(input);
    input.parent = root;

    const renderable = createRenderableTree(root);

    expect(renderable).toBeDefined();
    expect(renderable?.id).toBe(input.id);
    expect(renderable?.focusable).toBe(true);
  });
});
