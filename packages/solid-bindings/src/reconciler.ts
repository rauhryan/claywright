import { Renderable } from "@tui/core"
import { ElementNode, TextNode, RootNode, type TerminalNode } from "./jsx-runtime"
import { ElementRenderable } from "./ElementRenderable"

export function createRenderableTree(node: TerminalNode): Renderable | null {
  if (node instanceof TextNode) {
    return null
  }

  if (node instanceof RootNode) {
    if (node.children.length === 0) return null
    if (node.children.length === 1) {
      return createRenderableTree(node.children[0])
    }
    const root = new ElementRenderable(new ElementNode("root"))
    for (const child of node.children) {
      const childRenderable = createRenderableTree(child)
      if (childRenderable) {
        root.add(childRenderable)
      }
    }
    return root
  }

  if (node instanceof ElementNode) {
    const renderable = new ElementRenderable(node)

    for (const child of node.children) {
      const childRenderable = createRenderableTree(child)
      if (childRenderable) {
        renderable.add(childRenderable)
      }
    }

    return renderable
  }

  return null
}
