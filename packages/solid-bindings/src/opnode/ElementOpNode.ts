import { open, close, text, type Op } from "clayterm";
import { OpNode } from "./OpNode";
import { TextOpNode } from "./TextOpNode";

export class ElementOpNode extends OpNode {
  toOps(inheritedFloatingZIndex?: number): Op[] {
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
      const { openProps, floatingZIndex } = this.buildBoxProps(inheritedFloatingZIndex);
      ops.push(open(this.id, openProps));
      for (const child of this.children) {
        ops.push(...child.toOps(floatingZIndex));
      }
      ops.push(close());
    } else {
      const { openProps, floatingZIndex } = this.buildPassthroughProps(inheritedFloatingZIndex);
      ops.push(open(this.id, openProps));
      for (const child of this.children) {
        ops.push(...child.toOps(floatingZIndex));
      }
      ops.push(close());
    }

    return ops;
  }

  private buildBoxProps(inheritedFloatingZIndex?: number): {
    openProps: Record<string, unknown>;
    floatingZIndex: number | undefined;
  } {
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
    const clipProps = props.clip as { horizontal?: boolean; vertical?: boolean } | undefined;
    if (clipProps) {
      const clip: { horizontal?: boolean; vertical?: boolean } = {};
      if (clipProps.horizontal !== undefined) clip.horizontal = clipProps.horizontal;
      if (clipProps.vertical !== undefined) clip.vertical = clipProps.vertical;
      openProps.clip = clip;
    }
    const floatingZIndex = this.applyFloatingProps(openProps, props, inheritedFloatingZIndex);

    return { openProps, floatingZIndex };
  }

  private buildPassthroughProps(inheritedFloatingZIndex?: number): {
    openProps: Record<string, unknown>;
    floatingZIndex: number | undefined;
  } {
    const props = this.props as Record<string, unknown>;
    const openProps = { ...props };
    const floatingZIndex = this.applyFloatingProps(openProps, props, inheritedFloatingZIndex);
    return { openProps, floatingZIndex };
  }

  private applyFloatingProps(
    openProps: Record<string, unknown>,
    props: Record<string, unknown>,
    inheritedFloatingZIndex: number | undefined,
  ): number | undefined {
    let nextFloatingZIndex = inheritedFloatingZIndex;
    if (props.floating) {
      const floating = { ...(props.floating as Record<string, unknown>) };
      if (floating.zIndex === undefined && inheritedFloatingZIndex !== undefined) {
        floating.zIndex = inheritedFloatingZIndex;
      }
      openProps.floating = floating;
      if (typeof floating.zIndex === "number") nextFloatingZIndex = floating.zIndex;
    }
    return nextFloatingZIndex;
  }
}
