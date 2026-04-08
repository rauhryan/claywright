import { close, open, text, type Op } from "clayterm";
import { InputRenderable, Renderable } from "@tui/core";
import { ElementRenderable } from "./ElementRenderable";
import { ElementOpNode, TextOpNode, toSizingAxis } from "./opnode";

export function renderableToOps(renderable: Renderable): Op[] {
  const ops: Op[] = [];

  if (renderable instanceof InputRenderable) {
    const value = renderable.value.length > 0 ? renderable.value : renderable.placeholder;
    const display = renderable.showCursor ? injectCursor(value, renderable.cursorOffset) : value;
    ops.push(text(display, {}));
    return ops;
  }

  if (renderable instanceof ElementRenderable) {
    const node = renderable.node;
    if (node.type === "text") {
      const content = node.children
        .filter((c): c is TextOpNode => c instanceof TextOpNode)
        .map((c) => c.value)
        .join("");
      const textProps: { color?: number } = {};
      if (node.props.color !== undefined) textProps.color = node.props.color as number;
      ops.push(text(content, textProps));
      return ops;
    }

    const openProps: Record<string, unknown> = {};
    const props = node.props as Record<string, unknown>;

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
        (openProps.layout as Record<string, unknown>).width = toSizingAxis(
          props.width as Parameters<typeof toSizingAxis>[0],
        );
      if (props.height)
        (openProps.layout as Record<string, unknown>).height = toSizingAxis(
          props.height as Parameters<typeof toSizingAxis>[0],
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
    if (props.floating) openProps.floating = props.floating;

    ops.push(open(node.id, openProps));
    for (const child of renderable.children) {
      ops.push(...renderableToOps(child));
    }
    ops.push(close());
  }

  return ops;
}

function injectCursor(value: string, cursorOffset: number): string {
  const safeOffset = Math.max(0, Math.min(cursorOffset, value.length));
  const before = value.slice(0, safeOffset);
  const at = value[safeOffset] ?? " ";
  const after = value.slice(safeOffset + (safeOffset < value.length ? 1 : 0));
  return `${before}|${at}${after}`;
}
