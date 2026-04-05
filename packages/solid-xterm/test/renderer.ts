import { VirtualTerminal } from "./vt.ts";
import { TerminalNode, TextNode, ElementNode, RootNode } from "../jsx-runtime.ts";

export interface LayoutProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export async function renderToTerminal(root: RootNode, vt: VirtualTerminal): Promise<void> {
  vt.clear();
  await renderNode(root, vt, 0, 0, vt.cols, vt.rows);
  await vt.sync();
}

async function renderNode(
  node: TerminalNode,
  vt: VirtualTerminal,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  if (node instanceof TextNode) {
    const text = node.value;
    for (let i = 0; i < text.length && i < width; i++) {
      vt.write(`\x1b[${y + 1};${x + i + 1}H${text[i]}`);
    }
    return;
  }

  if (node instanceof ElementNode) {
    const props = node.props as LayoutProps;
    const nodeX = props.x ?? x;
    const nodeY = props.y ?? y;
    const nodeWidth = props.width ?? width;
    const nodeHeight = props.height ?? height;

    // For text elements, render all children inline
    if (node.type === "text") {
      let currentX = nodeX;
      for (const child of node.children) {
        if (child instanceof TextNode) {
          const text = child.value;
          for (let i = 0; i < text.length && currentX < nodeX + nodeWidth; i++) {
            vt.write(`\x1b[${nodeY + 1};${currentX + 1}H${text[i]}`);
            currentX++;
          }
        }
      }
      return;
    }

    // For other elements, render children vertically
    let currentY = nodeY;
    for (const child of node.children) {
      if (currentY >= nodeY + nodeHeight) break;
      await renderNode(child, vt, nodeX, currentY, nodeWidth, nodeHeight - (currentY - nodeY));
      currentY++;
    }
    return;
  }

  if (node instanceof RootNode) {
    let currentY = 0;
    for (const child of node.children) {
      if (currentY >= height) break;
      await renderNode(child, vt, x, currentY, width, height - currentY);
      currentY++;
    }
    return;
  }
}
