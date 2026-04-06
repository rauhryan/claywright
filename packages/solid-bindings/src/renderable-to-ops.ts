import { open, close, text, grow, type Op } from "clayterm";
import { Renderable } from "@tui/core";
import { ElementRenderable } from "./ElementRenderable";
import { toSizingAxis } from "./render";
import { TextNode } from "./jsx-runtime";

export function renderableToOps(renderable: Renderable): Op[] {
  const ops: Op[] = [];

  if (renderable instanceof ElementRenderable) {
    const node = renderable.node;

    if (node.type === "text") {
      const content = node.children
        .filter((c): c is TextNode => c instanceof TextNode)
        .map((c) => c.value)
        .join("");
      ops.push(text(content, { color: node.props.color as any }));
    } else if (node.type === "box") {
      const props = node.props as any;
      const openProps: any = {};

      if (
        props.width ||
        props.height ||
        props.direction ||
        props.padding ||
        props.gap ||
        props.alignX ||
        props.alignY
      ) {
        openProps.layout = {};
        if (props.width) openProps.layout.width = toSizingAxis(props.width);
        if (props.height) openProps.layout.height = toSizingAxis(props.height);
        if (props.direction) openProps.layout.direction = props.direction;
        if (props.padding) openProps.layout.padding = props.padding;
        if (props.gap !== undefined) openProps.layout.gap = props.gap;
        if (props.alignX !== undefined) openProps.layout.alignX = props.alignX;
        if (props.alignY !== undefined) openProps.layout.alignY = props.alignY;
      }

      if (props.bg !== undefined) openProps.bg = props.bg;
      if (props.border) openProps.border = props.border;
      if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius;

      ops.push(open(node.id, openProps));
      for (const child of renderable.children) {
        ops.push(...renderableToOps(child));
      }
      ops.push(close());
    } else {
      ops.push(open(node.id, node.props as any));
      for (const child of renderable.children) {
        ops.push(...renderableToOps(child));
      }
      ops.push(close());
    }
  } else {
    ops.push(open(renderable.id, { layout: { width: grow(), height: grow() } }));
    for (const child of renderable.children) {
      ops.push(...renderableToOps(child));
    }
    ops.push(close());
  }

  return ops;
}
