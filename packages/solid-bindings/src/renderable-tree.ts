import { Renderable } from "@tui/core";
import { ElementOpNode, TextOpNode, type OpNode } from "./opnode";
import { ElementRenderable } from "./ElementRenderable";
import { InputElementRenderable } from "./InputElementRenderable";

export function createRenderableTree(node: OpNode): Renderable | null {
  if (node instanceof TextOpNode) {
    return null;
  }

  if (node instanceof ElementOpNode && node.type === "root") {
    if (node.children.length === 0) return null;
    if (node.children.length === 1) {
      return createRenderableTree(node.children[0]!);
    }
    const root = new ElementRenderable(new ElementOpNode("root", node.id));
    for (const child of node.children) {
      const childRenderable = createRenderableTree(child);
      if (childRenderable) {
        root.add(childRenderable);
      }
    }
    return root;
  }

  if (node instanceof ElementOpNode) {
    const renderable: Renderable =
      node.type === "input" ? new InputElementRenderable(node) : new ElementRenderable(node);

    for (const child of node.children) {
      const childRenderable = createRenderableTree(child);
      if (childRenderable) {
        renderable.add(childRenderable);
      }
    }

    return renderable;
  }

  return null;
}
