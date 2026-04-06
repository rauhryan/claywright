import { Renderable } from "@tui/core";
import { ElementNode } from "./jsx-runtime";

export class ElementRenderable extends Renderable {
  node: ElementNode;

  constructor(node: ElementNode) {
    super({ id: node.id, focusable: node.props.focusable as boolean | undefined });
    this.node = node;

    // Set event handlers from node.props
    // We need to use Object.defineProperty because the parent class has these as properties
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
    ];

    for (const handler of handlers) {
      Object.defineProperty(this, handler, {
        get: () => this.node.props[handler],
        enumerable: true,
        configurable: true,
      });
    }
  }
}
