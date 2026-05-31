import { describe, expect, test } from "bun:test";
import type { OpenElement, Op } from "clayterm";
import { RootNode, jsx } from "../src/jsx-runtime";
import { createRenderableTree } from "../src/renderable-tree";
import { renderableToOps } from "../src/renderable-to-ops";

function openOps(ops: Op[]): OpenElement[] {
  return ops.filter((op): op is OpenElement => op.directive === 0x02);
}

describe("renderableToOps", () => {
  test("serializes boolean clip props without old offset fields", () => {
    const root = new RootNode();
    root.add(
      jsx("box", {
        id: "clipped",
        clip: { horizontal: true, vertical: true },
      }),
    );

    const renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();

    const clipped = openOps(renderableToOps(renderable!)).find((op) => op.id === "clipped");
    expect(clipped?.clip).toEqual({ horizontal: true, vertical: true });
    expect(clipped?.clip).not.toHaveProperty("x");
    expect(clipped?.clip).not.toHaveProperty("y");
  });

  test("inherits floating z-index for nested floating implementation layers", () => {
    const root = new RootNode();
    root.add(
      jsx("box", {
        id: "floating-window",
        floating: { attachTo: "root", zIndex: 45 },
        children: jsx("box", {
          id: "floating-content",
          floating: {
            attachTo: "parent",
            attachPoints: { element: "left-top", parent: "left-top" },
          },
        }),
      }),
    );

    const renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();

    const content = openOps(renderableToOps(renderable!)).find(
      (op) => op.id === "floating-content",
    );
    expect(content?.floating?.zIndex).toBe(45);
  });
});
