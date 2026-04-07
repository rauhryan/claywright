import { Renderable } from "@tui/core";
import { ElementOpNode } from "./opnode";

export class ElementRenderable extends Renderable {
  node: ElementOpNode;

  constructor(node: ElementOpNode) {
    super({ id: node.id, focusable: node.props.focusable as boolean | undefined });
    this.node = node;

    const handlers = [
      "onClick",
      "onMouseDown",
      "onMouseUp",
      "onMouseMove",
      "onKeyDown",
      "onKeyUp",
      "onPaste",
      "onFocus",
      "onBlur",
    ] as const;

    for (const handler of handlers) {
      Object.defineProperty(this, handler, {
        configurable: true,
        enumerable: true,
        get: () => this.node.props[handler],
      });
    }
  }
}
