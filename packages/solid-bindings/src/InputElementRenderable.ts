import { InputRenderable } from "@tui/core";
import { ElementNode } from "./jsx-runtime";

export class InputElementRenderable extends InputRenderable {
  node: ElementNode;

  constructor(node: ElementNode) {
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

    const handlers = [
      "onClick",
      "onMouseDown",
      "onMouseMove",
      "onMouseUp",
      "onKeyDown",
      "onKeyUp",
      "onPaste",
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
