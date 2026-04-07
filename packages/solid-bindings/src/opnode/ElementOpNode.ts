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
      const textProps: any = {};
      if (this.props.color !== undefined) textProps.color = this.props.color;
      ops.push(text(content, textProps));
    } else if (this.type === "box") {
      const openProps = this.buildBoxProps();
      ops.push(open(this.id, openProps));
      for (const child of this.children) {
        ops.push(...child.toOps());
      }
      ops.push(close());
    } else {
      ops.push(open(this.id, this.props as any));
      for (const child of this.children) {
        ops.push(...child.toOps());
      }
      ops.push(close());
    }

    return ops;
  }

  private buildBoxProps(): Record<string, unknown> {
    const props = this.props as any;
    const openProps: any = {};

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
      if (props.width) openProps.layout.width = this.toSizingAxis(props.width);
      if (props.height) openProps.layout.height = this.toSizingAxis(props.height);
      if (props.direction) openProps.layout.direction = props.direction;
      if (props.padding) openProps.layout.padding = props.padding;
      if (props.gap !== undefined) openProps.layout.gap = props.gap;
      if (props.alignX !== undefined) openProps.layout.alignX = props.alignX;
      if (props.alignY !== undefined) openProps.layout.alignY = props.alignY;
    }

    if (props.bg !== undefined) openProps.bg = props.bg;
    if (props.border) openProps.border = props.border;
    if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius;

    return openProps;
  }
}
