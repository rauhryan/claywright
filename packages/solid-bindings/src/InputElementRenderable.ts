import { InputRenderable } from "@tui/core";
import { ElementOpNode } from "./opnode";
import { proxyHandlers } from "./ElementRenderable";

const INPUT_HANDLER_KEYS = [
  "onClick",
  "onMouseDown",
  "onMouseMove",
  "onMouseUp",
  "onWheel",
  "onKeyDown",
  "onKeyUp",
  "onPaste",
] as const;

export class InputElementRenderable extends InputRenderable {
  node: ElementOpNode;

  constructor(node: ElementOpNode) {
    super({
      cursorOffset: node.props.cursorOffset as number | undefined,
      focusable: (node.props.focusable as boolean | undefined) ?? true,
      id: node.id,
      onBlur: node.props.onBlur as (() => void) | undefined,
      onFocus: node.props.onFocus as (() => void) | undefined,
      onInput: node.props.onInput as ((value: string) => void) | undefined,
      placeholder: node.props.placeholder as string | undefined,
      value: node.props.value as string | undefined,
    });

    this.node = node;

    for (const handler of INPUT_HANDLER_KEYS) {
      Object.defineProperty(this, handler, {
        configurable: true,
        enumerable: true,
        get: () => this.node.props[handler],
      });
    }
  }
}
