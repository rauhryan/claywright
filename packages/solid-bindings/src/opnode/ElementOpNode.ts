import { open, close, text, type Op } from "clayterm";
import { OpNode } from "./OpNode";
import { TextOpNode } from "./TextOpNode";

export class ElementOpNode extends OpNode {
  toOps(): Op[] {
    const ops: Op[] = [];

    if (this.type === "text") {
      const content = this.children
        .filter((c): c is TextOpNode => c instanceof TextOpNode)
        .map((c) => c.value)
        .join("");
      const textProps: { color?: number } = {};
      if (this.props.color !== undefined) textProps.color = this.props.color as number;
      ops.push(text(content, textProps));
    } else if (this.type === "box") {
      const openProps = this.buildBoxProps();
      ops.push(open(this.id, openProps));
      for (const child of this.children) {
        ops.push(...child.toOps());
      }
      ops.push(close());
    } else {
      ops.push(open(this.id, this.props as Record<string, unknown>));
      for (const child of this.children) {
        ops.push(...child.toOps());
      }
      ops.push(close());
    }

    return ops;
  }

  private buildBoxProps(): Record<string, unknown> {
    const props = this.props as Record<string, unknown>;
    const openProps: Record<string, unknown> = {};

    if (
      props.width ||
      props.height ||
      props.direction ||
      props.padding ||
      props.gap !== undefined ||
      props.alignX !== undefined ||
      props.alignY !== undefined
    ) {
      openProps.layout = {};
      if (props.width)
        (openProps.layout as Record<string, unknown>).width = this.toSizingAxis(
          props.width as Parameters<typeof this.toSizingAxis>[0],
        );
      if (props.height)
        (openProps.layout as Record<string, unknown>).height = this.toSizingAxis(
          props.height as Parameters<typeof this.toSizingAxis>[0],
        );
      if (props.direction)
        (openProps.layout as Record<string, unknown>).direction = props.direction;
      if (props.padding) (openProps.layout as Record<string, unknown>).padding = props.padding;
      if (props.gap !== undefined) (openProps.layout as Record<string, unknown>).gap = props.gap;
      if (props.alignX !== undefined)
        (openProps.layout as Record<string, unknown>).alignX = props.alignX;
      if (props.alignY !== undefined)
        (openProps.layout as Record<string, unknown>).alignY = props.alignY;
    }

    if (props.bg !== undefined) openProps.bg = props.bg;
    if (props.border) openProps.border = props.border;
    if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius;
    if (props.clip) openProps.clip = props.clip;
    if (props.floating) openProps.floating = props.floating;

    return openProps;
  }
}
