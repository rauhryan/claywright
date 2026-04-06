import { createRoot, createMemo, flatten, flush } from "solid-js/dist/solid.js";

let idCounter = 0;
function generateId(): string {
  return `el_${idCounter++}`;
}

export class TextNode {
  readonly type = "text";
  value: string;
  parent: ElementNode | RootNode | null = null;

  constructor(value: string) {
    this.value = value;
  }
}

export class ElementNode {
  readonly type: string;
  id: string;
  props: Record<string, unknown> = {};
  children: (TextNode | ElementNode)[] = [];
  parent: ElementNode | RootNode | null = null;

  constructor(type: string) {
    this.type = type;
    this.id = generateId();
  }
}

export class RootNode {
  readonly type = "root";
  children: (TextNode | ElementNode)[] = [];
}

export type TerminalNode = TextNode | ElementNode | RootNode;

function isParentNode(node: TerminalNode): node is RootNode | ElementNode {
  return node instanceof RootNode || node instanceof ElementNode;
}

function createElement(tag: string): ElementNode {
  return new ElementNode(tag);
}

function createTextNode(value: string): TextNode {
  return new TextNode(value);
}

function insertNode(
  parent: TerminalNode,
  node: TerminalNode,
  anchor?: TerminalNode
): void {
  if (!isParentNode(parent)) return;
  const index = anchor ? parent.children.indexOf(anchor as any) : -1;
  if (index >= 0) {
    parent.children.splice(index, 0, node as any);
  } else {
    parent.children.push(node as any);
  }
  (node as any).parent = parent;
}

function removeNode(parent: TerminalNode, node: TerminalNode): void {
  if (!isParentNode(parent)) return;
  const index = parent.children.indexOf(node as any);
  if (index >= 0) {
    parent.children.splice(index, 1);
    (node as any).parent = null;
  }
}

function setProperty(node: TerminalNode, name: string, value: unknown): void {
  if (node instanceof ElementNode) {
    if (value === undefined) {
      delete node.props[name];
    } else {
      node.props[name] = value;
    }
  }
}

export function setProp(node: TerminalNode, name: string, value: unknown, prev?: unknown): unknown {
  setProperty(node, name, value);
  return value;
}

function getParentNode(node: TerminalNode): TerminalNode | undefined {
  return node.parent ?? undefined;
}

function getFirstChild(node: TerminalNode): TerminalNode | undefined {
  if (isParentNode(node)) {
    return node.children[0];
  }
  return undefined;
}

function getNextSibling(node: TerminalNode): TerminalNode | undefined {
  if (!node.parent || !isParentNode(node.parent)) return undefined;
  const index = node.parent.children.indexOf(node as any);
  return node.parent.children[index + 1];
}

const effect = <T,>(
  fn: (prev: T | undefined) => T,
  effectFn: (value: T, prev: T | undefined) => void,
  initial?: T
): void => {
  (createMemo as any)(fn, effectFn, initial);
};

const memoTransparent = <T,>(fn: () => T, transparent: boolean): (() => T) => {
  return createMemo(() => fn()) as any;
};

function insert(
  parent: TerminalNode,
  accessor: unknown,
  marker?: TerminalNode,
  initial?: unknown
): void {
  const multi = marker !== undefined;
  if (multi && !initial) initial = [];
  if (typeof accessor !== "function") {
    accessor = normalize(accessor, multi, true);
    if (typeof accessor !== "function") {
      insertExpression(
        parent,
        accessor as TerminalNode | TerminalNode[],
        initial as TerminalNode[],
        marker
      );
      return;
    }
  }
  const memoed = memoTransparent(() => (accessor as () => unknown)(), true);
  if (multi && (initial as TerminalNode[]).length === 0) {
    const sentinel = createTextNode("");
    insertNode(parent, sentinel, marker);
    initial = [sentinel];
  }
  effect(
    () => {
      const value = normalize((memoed as () => unknown)(), multi) as
        | TerminalNode
        | TerminalNode[];
      return value;
    },
    (value, current) => {
      insertExpression(
        parent,
        value as TerminalNode | TerminalNode[],
        current as TerminalNode[],
        marker
      );
    },
    initial as TerminalNode[]
  );
}

function insertExpression(
  parent: TerminalNode,
  value: TerminalNode | TerminalNode[],
  current: TerminalNode[],
  marker?: TerminalNode
): void {
  const multi = marker !== undefined;

  if (typeof value === "string" || typeof value === "number") {
    if (parent instanceof TextNode) {
      parent.value = String(value);
      return;
    }
    const textNode = createTextNode(String(value));
    if (Array.isArray(current)) {
      cleanChildren(parent, current, marker, textNode);
    } else if (current == null || !getFirstChild(parent)) {
      insertNode(parent, textNode);
    } else {
      replaceNode(parent, textNode, getFirstChild(parent)!);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      cleanChildren(parent, current, marker);
    } else if (Array.isArray(current)) {
      if (current.length === 0) {
        appendNodes(parent, value, marker);
      } else {
        reconcileArrays(parent, current, value);
      }
    } else if (current == null) {
      appendNodes(parent, value);
    } else {
      reconcileArrays(parent, (multi && current) || [getFirstChild(parent)!], value);
    }
    return;
  }

  if (Array.isArray(current)) {
    cleanChildren(parent, current, multi ? marker : undefined, value);
  } else if (current == null || !getFirstChild(parent)) {
    insertNode(parent, value);
  } else {
    replaceNode(parent, value, getFirstChild(parent)!);
  }
}

function normalize(value: unknown, multi: boolean, doNotUnwrap = false): unknown {
  value = flatten(value as any, { skipNonRendered: true, doNotUnwrap } as any);
  if (doNotUnwrap && typeof value === "function") return value;
  if (multi && !Array.isArray(value)) value = [value != null ? value : ""];
  if (Array.isArray(value)) {
    for (let i = 0, len = value.length; i < len; i++) {
      const item = (value as unknown[])[i];
      const t = typeof item;
      if (t === "string" || t === "number")
        (value as unknown[])[i] = createTextNode(String(item));
    }
  }
  return value;
}

function reconcileArrays(
  parent: TerminalNode,
  a: TerminalNode[],
  b: TerminalNode[]
): void {
  let bLength = b.length;
  let aEnd = a.length;
  let bEnd = bLength;
  let aStart = 0;
  let bStart = 0;
  const after = getNextSibling(a[aEnd - 1]);
  let map: Map<TerminalNode, number> | null = null;

  while (aStart < aEnd || bStart < bEnd) {
    if (a[aStart] === b[bStart]) {
      aStart++;
      bStart++;
      continue;
    }

    while (a[aEnd - 1] === b[bEnd - 1]) {
      aEnd--;
      bEnd--;
    }

    if (aEnd === aStart) {
      const node =
        bEnd < bLength
          ? bStart
            ? getNextSibling(b[bStart - 1])
            : b[bEnd - bStart]
          : after;
      while (bStart < bEnd) insertNode(parent, b[bStart++], node);
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(a[aStart])) removeNode(parent, a[aStart]);
        aStart++;
      }
    } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
      const node = getNextSibling(a[--aEnd]);
      insertNode(parent, b[bStart++], getNextSibling(a[aStart++]));
      insertNode(parent, b[--bEnd], node);
      a[aEnd] = b[bEnd];
    } else {
      if (!map) {
        map = new Map();
        let i = bStart;
        while (i < bEnd) map.set(b[i], i++);
      }

      const index = map.get(a[aStart]);
      if (index != null) {
        if (bStart < index && index < bEnd) {
          let i = aStart;
          let sequence = 1;
          let t: number | undefined;
          while (++i < aEnd && i < bEnd) {
            t = map.get(a[i]);
            if (t == null || t !== index + sequence) break;
            sequence++;
          }

          if (sequence > index - bStart) {
            const node = a[aStart];
            while (bStart < index) insertNode(parent, b[bStart++], node);
          } else {
            replaceNode(parent, b[bStart++], a[aStart++]);
          }
        } else {
          aStart++;
        }
      } else {
        removeNode(parent, a[aStart++]);
      }
    }
  }
}

function cleanChildren(
  parent: TerminalNode,
  current: TerminalNode[],
  marker?: TerminalNode,
  replacement?: TerminalNode
): void {
  if (marker === undefined) {
    let removed;
    while ((removed = getFirstChild(parent)!)) removeNode(parent, removed);
    if (replacement) insertNode(parent, replacement);
    return;
  }

  if (current.length) {
    let inserted = false;
    for (let i = current.length - 1; i >= 0; i--) {
      const el = current[i];
      if (replacement !== el) {
        const isParent = getParentNode(el) === parent;
        if (replacement && !inserted && !i) {
          isParent ? replaceNode(parent, replacement, el) : insertNode(parent, replacement, marker);
        } else if (isParent) {
          removeNode(parent, el);
        }
      } else {
        inserted = true;
      }
    }
  } else if (replacement) {
    insertNode(parent, replacement, marker);
  }
}

function appendNodes(parent: TerminalNode, array: TerminalNode[], marker?: TerminalNode): void {
  for (let i = 0, len = array.length; i < len; i++) {
    insertNode(parent, array[i], marker);
  }
}

function replaceNode(parent: TerminalNode, newNode: TerminalNode, oldNode: TerminalNode): void {
  insertNode(parent, newNode, oldNode);
  removeNode(parent, oldNode);
}

function spread(node: TerminalNode, props: Record<string, unknown>, skipChildren?: boolean): void {
  const prevProps: Record<string, unknown> = {};
  props || (props = {});
  if (!skipChildren) insert(node, () => props.children);
  effect(
    () => {
      const r = props.ref;
      if (typeof r === "function") {
        r(node);
      } else if (Array.isArray(r)) {
        r.forEach((fn) => fn && fn(node));
      }
      return undefined;
    },
    () => {}
  );
  effect(
    () => {
      const newProps: Record<string, unknown> = {};
      for (const prop in props) {
        if (prop === "children" || prop === "ref") continue;
        newProps[prop] = props[prop];
      }
      return newProps;
    },
    (nextProps: Record<string, unknown>) => {
      for (const prop in prevProps) {
        if (!(prop in nextProps)) {
          setProperty(node, prop, undefined);
          delete prevProps[prop];
        }
      }
      for (const prop in nextProps) {
        const value = nextProps[prop];
        if (value === prevProps[prop]) continue;
        setProperty(node, prop, value);
        prevProps[prop] = value;
      }
    }
  );
}

export function createComponent<T>(Comp: (props: T) => TerminalNode, props: T): TerminalNode {
  return createRoot(() => Comp(props));
}

export { createElement, createTextNode, insertNode, insert, spread, flush, effect };

export function render(code: () => TerminalNode, root: RootNode): () => void {
  let disposer: () => void;
  createRoot((dispose) => {
    disposer = dispose;
    insert(root, code());
  });
  flush();
  return disposer!;
}

export function renderToString(node: TerminalNode): string {
  if (node instanceof TextNode) {
    return node.value;
  }
  if (node instanceof ElementNode) {
    const children = node.children.map(renderToString).join("");
    return `<${node.type}>${children}</${node.type}>`;
  }
  if (node instanceof RootNode) {
    return node.children.map(renderToString).join("");
  }
  return "";
}

export namespace JSX {
  export type Element = TerminalNode;
  export interface IntrinsicElements {
    text: { color?: number; children?: unknown };
    box: {
      children?: unknown;
      width?: { type: "fixed" | "grow" | "percent" | "fit"; value?: number; min?: number; max?: number };
      height?: { type: "fixed" | "grow" | "percent" | "fit"; value?: number; min?: number; max?: number };
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

export function jsx(
  type: string,
  props: Record<string, unknown> | null
): ElementNode {
  const el = createElement(type);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key !== "children") {
        el.props[key] = value;
      }
    }
    if (props.children !== undefined) {
      const children = Array.isArray(props.children) ? props.children : [props.children];
      for (const child of children) {
        if (typeof child === "string" || typeof child === "number") {
          insertNode(el, createTextNode(String(child)));
        } else if (child instanceof TextNode || child instanceof ElementNode) {
          insertNode(el, child);
        }
      }
    }
  }
  return el;
}

export const jsxs = jsx;

export function jsxDEV(
  type: string,
  props: Record<string, unknown> | null,
  key?: string,
  isStaticChildren?: boolean,
  source?: { fileName: string; lineNumber: number; columnNumber: number },
  self?: unknown
): ElementNode {
  return jsx(type, props);
}
