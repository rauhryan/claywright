import { createMemo, createRenderEffect } from "solid-js";
import { OpNode, ElementOpNode, TextOpNode, SlotOpNode, resetIdCounter } from "./opnode";
import { createReconciler } from "./reconciler/index";
import { defaultReconcilerOptions } from "./reconciler/defaults";
import type { MouseEvent, KeyboardEvent, PasteEvent } from "@tui/core";

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

export function mergeProps<T extends Record<string, unknown>>(...sources: (T | undefined)[]): T {
  return reconciler.mergeProps(...sources);
}

function applyRef(value: unknown, node: OpNode): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      applyRef(item, node);
    }
    return;
  }

  if (typeof value === "function") {
    value(node);
  }
}

export function ref(accessor: () => unknown, node: OpNode): void {
  createRenderEffect(accessor, (value) => {
    applyRef(value, node);
  });
}

export const effect = createRenderEffect;

export function createComponent<T extends Record<string, unknown>>(
  Comp: (props: T) => unknown,
  props: T,
): unknown {
  return reconciler.createComponent(Comp, props);
}

export function Fragment(props: { children?: unknown }): OpNode {
  const root = new RootNode();
  appendChildren(root, props.children);
  return root;
}

export function render(code: () => unknown, root: OpNode): () => void {
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
  export type Element = unknown;
  export interface ElementChildrenAttribute {
    children: {};
  }
  interface FocusableProps {
    id?: string;
    focusable?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    onClick?: (event: MouseEvent) => void;
    onMouseDown?: (event: MouseEvent) => void;
    onMouseUp?: (event: MouseEvent) => void;
    onMouseMove?: (event: MouseEvent) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onPaste?: (event: PasteEvent) => void;
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
  while (typeof value === "function") {
    value = value();
  }

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
    for (const child of value.children.slice()) {
      insertNode(parent, child);
    }
    return;
  }

  if (value instanceof OpNode) {
    insertNode(parent, value);
  }
}

export function jsx(
  type: string | ((props: Record<string, unknown>) => unknown),
  props: Record<string, unknown> | null,
): unknown {
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
    if (props.children !== undefined) {
      insert(el, props.children);
    }
  }
  return el;
}

export const jsxs = jsx;

export function jsxDEV(
  type: string | ((props: Record<string, unknown>) => unknown),
  props: Record<string, unknown> | null,
  _key?: string,
  _isStaticChildren?: boolean,
  _source?: { fileName: string; lineNumber: number; columnNumber: number },
  _self?: unknown,
): unknown {
  return jsx(type, props);
}
