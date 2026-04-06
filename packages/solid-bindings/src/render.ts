import { createTerm, open, close, text, grow, type Op } from "clayterm";
import { RootNode, ElementNode, TextNode, type TerminalNode } from "./jsx-runtime";

export interface RenderOptions {
  width?: number;
  height?: number;
}

export async function render(
  code: () => TerminalNode,
  options: RenderOptions = {}
): Promise<void> {
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
