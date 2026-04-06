import { close, fixed, fit, grow, open, rgba, text, type Op } from "clayterm";
import { InputRenderable, Renderable } from "@tui/core";
import { ElementRenderable } from "./ElementRenderable";
import { toSizingAxis } from "./render";
import { TextNode } from "./jsx-runtime";

const INPUT_PLACEHOLDER_COLOR = rgba(120, 128, 140);
const INPUT_TEXT_COLOR = rgba(255, 255, 255);
const INPUT_CURSOR_COLOR = rgba(90, 140, 255);

export function renderableToOps(renderable: Renderable): Op[] {
  const ops: Op[] = [];

  if (renderable instanceof InputRenderable) {
    const usingPlaceholder = renderable.value.length === 0;
    const textValue = usingPlaceholder ? renderable.placeholder : renderable.value;
    const baseValue = textValue.length === 0 ? " " : textValue;
    const textColor = usingPlaceholder ? INPUT_PLACEHOLDER_COLOR : INPUT_TEXT_COLOR;
    const cursorOffset = Math.max(0, Math.min(renderable.cursorOffset, baseValue.length));
    const displayValue =
      renderable.showCursor && !usingPlaceholder
        ? `${baseValue.slice(0, cursorOffset)}|${baseValue.slice(cursorOffset)}`
        : renderable.showCursor && usingPlaceholder
          ? `|${baseValue}`
          : baseValue;
    const displayWidth = Math.max(1, displayValue.length);

    ops.push(
      open(renderable.id, {
        layout: {
          height: fixed(1),
          width: fit(displayWidth),
        },
      }),
    );

    ops.push(
      open(renderable.id, {
        layout: {
          height: fixed(1),
          width: fit(displayWidth),
        },
      }),
    );

    if (!renderable.showCursor) {
      ops.push(text(displayValue, { color: textColor }));
    } else if (usingPlaceholder) {
      ops.push(text("|", { color: INPUT_CURSOR_COLOR }));
      ops.push(text(baseValue, { color: textColor }));
    } else {
      const beforeCursor = baseValue.slice(0, cursorOffset);
      const cursorChar = baseValue[cursorOffset] ?? " ";
      const afterCursor = baseValue.slice(cursorOffset + (cursorOffset < baseValue.length ? 1 : 0));

      if (beforeCursor.length > 0) {
        ops.push(text(beforeCursor, { color: textColor }));
      }

      ops.push(text(`|${cursorChar === " " ? "" : cursorChar}`, { color: INPUT_CURSOR_COLOR }));

      if (afterCursor.length > 0) {
        ops.push(text(afterCursor, { color: textColor }));
      }
    }

    ops.push(close());

    ops.push(close());

    return ops;
  }

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
