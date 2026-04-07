import { createMemo, createRenderEffect, createComponent as solidCreateComponent } from "solid-js";
import { OpNode, ElementOpNode, TextOpNode, SlotOpNode, resetIdCounter } from "./opnode";
import { createReconciler } from "./reconciler/index";
import { defaultReconcilerOptions } from "./reconciler/defaults";

export const memo = createMemo;

export { resetIdCounter };

export class RootNode extends ElementOpNode {
  constructor() {
    super("root", "root");
  }
}

export { OpNode as TerminalNode, ElementOpNode as ElementNode, TextOpNode as TextNode, SlotOpNode };

const reconciler = createReconciler(defaultReconcilerOptions);

export function createElement(tag: string): ElementOpNode {
  return reconciler.createElement(tag) as ElementOpNode;
}

export function createTextNode(value: string): TextOpNode {
  return reconciler.createTextNode(value);
}

export function insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void {
  reconciler.insertNode(parent, node, anchor);
}

export function insert(
  parent: OpNode,
  accessor: unknown,
  marker?: OpNode,
  initial?: unknown,
): OpNode | unknown {
  return reconciler.insert(parent, accessor, marker, initial);
}

export function spread(node: OpNode, accessor: unknown, skipChildren?: boolean): void {
  reconciler.spread(node, accessor, skipChildren);
}

export function setProp<T>(node: OpNode, name: string, value: T, prev?: T): T {
  return reconciler.setProp(node, name, value, prev);
}

export const effect = createRenderEffect;

export function createComponent<T extends Record<string, unknown>>(
  Comp: (props: T) => OpNode,
  props: T,
): OpNode {
  return solidCreateComponent(Comp as any, props as any) as unknown as OpNode;
}

export function Fragment(props: { children?: unknown }): OpNode {
  const root = new RootNode();
  appendChildren(root, props.children);
  return root;
}

export function render(code: () => OpNode, root: OpNode): () => void {
  return reconciler.render(code, root);
}

export function renderToString(node: OpNode): string {
  if (node instanceof TextOpNode) {
    return node.value;
  }
  const children = node.children.map(renderToString).join("");
  return node.type === "root" ? children : `<${node.type}>${children}</${node.type}>`;
}

export namespace JSX {
  export type Element = OpNode;
  export interface ElementChildrenAttribute {
    children: {};
  }
  interface FocusableProps {
    id?: string;
    focusable?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    onClick?: (event: unknown) => void;
    onMouseDown?: (event: unknown) => void;
    onMouseUp?: (event: unknown) => void;
    onMouseMove?: (event: unknown) => void;
    onKeyDown?: (event: unknown) => void;
    onKeyUp?: (event: unknown) => void;
    onPaste?: (event: unknown) => void;
  }
  export interface IntrinsicElements {
    text: { color?: number; children?: unknown };
    input: FocusableProps & {
      value?: string;
      placeholder?: string;
      cursorOffset?: number;
      onInput?: (value: string) => void;
    };
    box: FocusableProps & {
      children?: unknown;
      width?: {
        type: "fixed" | "grow" | "percent" | "fit";
        value?: number;
        min?: number;
        max?: number;
      };
      height?: {
        type: "fixed" | "grow" | "percent" | "fit";
        value?: number;
        min?: number;
        max?: number;
      };
      direction?: "ltr" | "ttb";
      padding?: { left?: number; right?: number; top?: number; bottom?: number };
      gap?: number;
      alignX?: number;
      alignY?: number;
      bg?: number;
      border?: { color: number; left?: number; right?: number; top?: number; bottom?: number };
      cornerRadius?: { tl?: number; tr?: number; bl?: number; br?: number };
    };
  }
}

function appendChildren(parent: OpNode, value: unknown): void {
  if (value == null || typeof value === "boolean") {
    return;
  }

  if (Array.isArray(value)) {
    for (const child of value) {
      appendChildren(parent, child);
    }
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    insertNode(parent, createTextNode(String(value)));
    return;
  }

  if (value instanceof RootNode) {
    for (const child of value.children) {
      insertNode(parent, child);
    }
    return;
  }

  if (value instanceof OpNode) {
    insertNode(parent, value);
  }
}

export function jsx(
  type: string | ((props: Record<string, unknown>) => OpNode),
  props: Record<string, unknown> | null,
): OpNode {
  if (typeof type === "function") {
    return createComponent(type, props ?? {});
  }

  const el = createElement(type);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "id" && typeof value === "string") {
        el.id = value;
      } else if (key !== "children") {
        el.props[key] = value;
      }
    }
    appendChildren(el, props.children);
  }
  return el;
}

export const jsxs = jsx;

export function jsxDEV(
  type: string | ((props: Record<string, unknown>) => OpNode),
  props: Record<string, unknown> | null,
  _key?: string,
  _isStaticChildren?: boolean,
  _source?: { fileName: string; lineNumber: number; columnNumber: number },
  _self?: unknown,
): OpNode {
  return jsx(type, props);
}
