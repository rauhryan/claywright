import { OpNode, ElementOpNode, TextOpNode, SlotOpNode } from "../opnode";
import { getNextId } from "../opnode/id-counter";
import type { ReconcilerOptions } from "./index";

export const defaultReconcilerOptions: ReconcilerOptions = {
  createElement(tag: string): OpNode {
    const id = getNextId(tag);
    return new ElementOpNode(tag, id);
  },

  createTextNode(value: string): TextOpNode {
    const id = getNextId("text-node");
    return new TextOpNode(id, value);
  },

  createSlotNode(): SlotOpNode {
    const id = getNextId("slot");
    return new SlotOpNode(id);
  },

  replaceText(node: TextOpNode, value: string): void {
    node.replace(value);
  },

  isTextNode(node: OpNode): boolean {
    return node instanceof TextOpNode;
  },

  setProperty(node: OpNode, name: string, value: unknown, _prev: unknown): void {
    if (name.startsWith("on:")) {
      node.props[name] = value;
      return;
    }

    if (value === undefined) {
      delete node.props[name];
    } else {
      node.props[name] = value;
    }
    node.markDirty();
  },

  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void {
    let targetNode = node;
    let targetAnchor = anchor;

    if (node instanceof SlotOpNode) {
      node.parent = parent;
      targetNode = node.getSlotChild(parent);
    }

    if (anchor instanceof SlotOpNode) {
      targetAnchor = anchor.getSlotChild(parent);
    }

    if (targetAnchor) {
      parent.insertBefore(targetNode, targetAnchor);
    } else {
      parent.add(targetNode);
    }
  },

  removeNode(parent: OpNode, node: OpNode): void {
    if (node instanceof SlotOpNode) {
      node.parent = null;
      return;
    }
    parent.remove(node);
  },

  getParentNode(node: OpNode): OpNode | undefined {
    return node.parent ?? undefined;
  },

  getFirstChild(node: OpNode): OpNode | undefined {
    return node.getFirstChild();
  },

  getNextSibling(node: OpNode): OpNode | undefined {
    return node.getNextSibling();
  },
};
