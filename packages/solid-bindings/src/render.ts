import {
  createTerm,
  open,
  close,
  text,
  grow,
  fixed,
  percent,
  fit,
  rgba,
  type Op,
  type SizingAxis,
} from "clayterm";
import { RootNode, ElementNode, TextNode, type TerminalNode } from "./jsx-runtime";

export { grow, fixed, percent, fit, rgba };

export interface RenderOptions {
  width?: number;
  height?: number;
}

export async function render(code: () => TerminalNode, options: RenderOptions = {}): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? 80;
  const height = options.height ?? process.stdout.rows ?? 24;

  const term = await createTerm({ width, height });
  const root = new RootNode();

  const { createRoot } = await import("solid-js");
  createRoot(() => {
    const node = code();
    if (node instanceof TextNode || node instanceof ElementNode) {
      root.children.push(node);
      node.parent = root;
    }
  });

  const ops = nodeToOps(root);
  const { output } = term.render(ops);
  process.stdout.write(output);
}

export function toSizingAxis(sizing?: {
  type: string;
  value?: number;
  min?: number;
  max?: number;
}): SizingAxis | undefined {
  if (!sizing) return undefined;
  switch (sizing.type) {
    case "fixed":
      return fixed(sizing.value ?? 0);
    case "grow":
      return grow(sizing.min, sizing.max);
    case "percent":
      return percent(sizing.value ?? 0);
    case "fit":
      return fit(sizing.min, sizing.max);
    default:
      return undefined;
  }
}

function nodeToOps(node: TerminalNode): Op[] {
  const ops: Op[] = [];

  if (node instanceof RootNode) {
    ops.push(open("root", { layout: { width: grow(), height: grow() } }));
    for (const child of node.children) {
      ops.push(...nodeToOps(child));
    }
    ops.push(close());
  } else if (node instanceof ElementNode) {
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
      for (const child of node.children) {
        ops.push(...nodeToOps(child));
      }
      ops.push(close());
    } else {
      ops.push(open(node.id, node.props as any));
      for (const child of node.children) {
        ops.push(...nodeToOps(child));
      }
      ops.push(close());
    }
  } else if (node instanceof TextNode) {
    ops.push(text(node.value, {}));
  }

  return ops;
}
