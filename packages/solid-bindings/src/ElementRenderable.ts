import { Renderable } from "@tui/core";
import { ElementOpNode } from "./opnode";

const EVENT_HANDLER_KEYS = [
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

export function proxyHandlers(instance: Renderable, node: ElementOpNode): void {
  for (const handler of EVENT_HANDLER_KEYS) {
    Object.defineProperty(instance, handler, {
      configurable: true,
      enumerable: true,
      get: () => node.props[handler],
    });
  }
}

export class ElementRenderable extends Renderable {
  node: ElementOpNode;

  constructor(node: ElementOpNode) {
    super({ id: node.id, focusable: node.props.focusable as boolean | undefined });
    this.node = node;
    proxyHandlers(this, node);
  }
}
