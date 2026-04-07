import { close, open, text, type Op } from "clayterm";
import { InputRenderable, Renderable } from "@tui/core";
import { ElementRenderable } from "./ElementRenderable";

export function renderableToOps(renderable: Renderable): Op[] {
  const ops: Op[] = [];

  if (renderable instanceof InputRenderable) {
    const value = renderable.value || renderable.placeholder;
    const cursorOffset = renderable.showCursor ? renderable.cursorOffset : undefined;
    const display = renderable.showCursor ? injectCursor(value, renderable.cursorOffset) : value;
    ops.push(text(display, {}));
    return ops;
  }

  if (renderable instanceof ElementRenderable) {
    const node = renderable.node;
    if (node.type === "text") {
      const content = node.children.map((child) => (child as any).value ?? "").join("");
      ops.push(text(content, { color: node.props.color as any }));
      return ops;
    }

    const openProps: Record<string, unknown> = {};
    const props = node.props as Record<string, any>;

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
      if (props.width) (openProps.layout as any).width = props.width;
      if (props.height) (openProps.layout as any).height = props.height;
      if (props.direction) (openProps.layout as any).direction = props.direction;
      if (props.padding) (openProps.layout as any).padding = props.padding;
      if (props.gap !== undefined) (openProps.layout as any).gap = props.gap;
      if (props.alignX !== undefined) (openProps.layout as any).alignX = props.alignX;
      if (props.alignY !== undefined) (openProps.layout as any).alignY = props.alignY;
    }

    if (props.bg !== undefined) openProps.bg = props.bg;
    if (props.border) openProps.border = props.border;
    if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius;

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
