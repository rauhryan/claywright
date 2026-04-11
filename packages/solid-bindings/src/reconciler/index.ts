import {
  createRoot,
  createRenderEffect,
  createMemo,
  type createComponent,
  untrack,
} from "solid-js";
import { OpNode, TextOpNode, SlotOpNode } from "../opnode";
import { isStatefulComponent } from "../component-flags";

const memo = <T>(fn: () => T): (() => T) => createMemo(() => fn());

// Most components must keep Solid's normal invocation semantics so boundaries
// like Errored/Loading continue to work. A small set of stateful terminal
// primitives opt into an untracked path to preserve internal runtime state.
const renderComponent: typeof createComponent = (Comp, props) =>
  isStatefulComponent(Comp) ? untrack(() => Comp(props || {})) : Comp(props || {});

type Disposer = () => void;

function mergeProps<T extends Record<string, unknown>>(...sources: (T | undefined)[]): T {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (source) {
      for (const key in source) {
        result[key] = source[key];
      }
    }
  }
  return result as T;
}

export interface ReconcilerOptions {
  createElement(tag: string): OpNode;
  createTextNode(value: string): TextOpNode;
  createSlotNode(): SlotOpNode;
  replaceText(node: TextOpNode, value: string): void;
  isTextNode(node: OpNode): boolean;
  setProperty(node: OpNode, name: string, value: unknown, prev: unknown): void;
  insertNode(parent: OpNode, node: OpNode, anchor?: OpNode): void;
  removeNode(parent: OpNode, node: OpNode): void;
  getParentNode(node: OpNode): OpNode | undefined;
  getFirstChild(node: OpNode): OpNode | undefined;
  getNextSibling(node: OpNode): OpNode | undefined;
}

export interface Reconciler {
  render: (code: () => unknown, root: OpNode) => Disposer;
  insert: (
    parent: OpNode,
    accessor: unknown,
    marker?: OpNode,
    initial?: unknown,
  ) => OpNode | unknown;
  spread: (node: OpNode, accessor: unknown, skipChildren?: boolean) => void;
  createElement: (tag: string) => OpNode;
  createTextNode: (value: string) => TextOpNode;
  insertNode: (parent: OpNode, node: OpNode, anchor?: OpNode) => void;
  setProp: <T>(node: OpNode, name: string, value: T, prev?: T) => T;
  effect: typeof createRenderEffect;
  memo: typeof memo;
  createComponent: typeof createComponent;
  mergeProps: typeof mergeProps;
  use: <A, T>(fn: (element: OpNode, arg: A) => T, element: OpNode, arg: A) => T;
}

export function createReconciler(options: ReconcilerOptions): Reconciler {
  const {
    createElement,
    createTextNode,
    createSlotNode,
    replaceText,
    isTextNode,
    setProperty,
    insertNode,
    removeNode,
    getParentNode,
    getFirstChild,
    getNextSibling,
  } = options;

  function insert(
    parent: OpNode,
    accessor: unknown,
    marker?: OpNode,
    initial?: unknown,
  ): OpNode | unknown {
    if (marker !== undefined && initial === undefined) initial = [];
    if (typeof accessor !== "function") {
      return insertExpression(parent, accessor, initial, marker);
    }
    createRenderEffect(
      () => (accessor as () => unknown)(),
      (value) => {
        initial = insertExpression(parent, value, initial, marker);
      },
    );
    return accessor;
  }

  function insertExpression(
    parent: OpNode,
    value: unknown,
    current: unknown,
    marker?: OpNode,
    unwrapArray?: boolean,
  ): OpNode | unknown {
    while (typeof current === "function") {
      current = (current as () => unknown)();
    }
    if (value === current) return current;

    const t = typeof value;
    const multi = marker !== undefined;

    if (t === "string" || t === "number") {
      const strValue = t === "number" ? String(value) : (value as string);
      if (multi) {
        let node = Array.isArray(current) ? (current[0] as OpNode) : undefined;
        if (node && isTextNode(node)) {
          replaceText(node as TextOpNode, strValue);
        } else {
          node = createTextNode(strValue);
        }
        current = cleanChildren(parent, current as OpNode[], marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          const firstChild = getFirstChild(parent);
          if (firstChild && isTextNode(firstChild)) {
            replaceText(firstChild as TextOpNode, strValue);
            current = strValue;
          }
        } else {
          cleanChildren(parent, current as OpNode, marker, createTextNode(strValue));
          current = strValue;
        }
      }
    } else if (value == null || t === "boolean") {
      current = cleanChildren(parent, current as OpNode, marker);
    } else if (t === "function") {
      createRenderEffect(
        () => {
          let v = (value as () => unknown)();
          while (typeof v === "function") {
            v = (v as () => unknown)();
          }
          return v;
        },
        (v) => {
          current = insertExpression(parent, v, current, marker);
        },
      );
      return () => current;
    } else if (Array.isArray(value)) {
      const array: OpNode[] = [];
      if (normalizeIncomingArray(array, value, unwrapArray)) {
        createRenderEffect(
          () => array,
          () => {
            current = insertExpression(parent, array, current as OpNode[], marker, true);
          },
        );
        return () => current;
      }
      if (array.length === 0) {
        const replacement = cleanChildren(parent, current as OpNode[], marker);
        if (multi) return (current = replacement);
      } else {
        if (Array.isArray(current)) {
          if (current.length === 0) {
            appendNodes(parent, array, marker);
          } else {
            reconcileArrays(parent, current as OpNode[], array);
          }
        } else if (current == null || current === "") {
          appendNodes(parent, array);
        } else {
          const currentArray =
            multi && Array.isArray(current)
              ? current
              : getFirstChild(parent)
                ? [getFirstChild(parent)!]
                : [];
          if (currentArray.length === 0) {
            appendNodes(parent, array);
          } else {
            reconcileArrays(parent, currentArray as OpNode[], array);
          }
        }
      }
      current = array;
    } else if (value instanceof OpNode) {
      if (Array.isArray(current)) {
        if (multi) {
          return (current = cleanChildren(parent, current as OpNode[], marker, value as OpNode));
        }
        cleanChildren(parent, current as OpNode[], undefined, value as OpNode);
      } else if (current == null || current === "" || !getFirstChild(parent)) {
        insertNode(parent, value as OpNode);
      } else {
        replaceNode(parent, value as OpNode, getFirstChild(parent)!);
      }
      current = value;
    }
    return current;
  }

  function normalizeIncomingArray(
    normalized: OpNode[],
    array: unknown[],
    unwrap?: boolean,
  ): boolean {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i];
      let t: string;
      if (item == null || item === true || item === false) {
        continue;
      } else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, unwrap) || dynamic;
      } else if ((t = typeof item) === "string" || t === "number") {
        normalized.push(createTextNode(t === "number" ? item.toString() : (item as string)));
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function") {
            item = (item as () => unknown)();
          }
          dynamic =
            normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], unwrap) ||
            dynamic;
        } else {
          normalized.push(item as OpNode);
          dynamic = true;
        }
      } else {
        normalized.push(item as OpNode);
      }
    }
    return dynamic;
  }

  function reconcileArrays(parentNode: OpNode, a: OpNode[], b: OpNode[]): void {
    const bLength = b.length;
    let aEnd = a.length;
    let bEnd = bLength;
    let aStart = 0;
    let bStart = 0;
    const after = aEnd > 0 ? getNextSibling(a[aEnd - 1]) : undefined;
    let map: Map<OpNode, number> | null = null;

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
          bEnd < bLength ? (bStart ? getNextSibling(b[bStart - 1]) : b[bEnd - bStart]) : after;
        while (bStart < bEnd) {
          insertNode(parentNode, b[bStart++], node);
        }
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) {
            removeNode(parentNode, a[aStart]);
          }
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = getNextSibling(a[--aEnd]);
        insertNode(parentNode, b[bStart++], getNextSibling(a[aStart++]));
        insertNode(parentNode, b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;
          while (i < bEnd) {
            map.set(b[i], i++);
          }
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart;
            let sequence = 1;
            let t: number | undefined;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) {
                insertNode(parentNode, b[bStart++], node);
              }
            } else {
              replaceNode(parentNode, b[bStart++], a[aStart++]);
            }
          } else {
            aStart++;
          }
        } else {
          removeNode(parentNode, a[aStart++]);
        }
      }
    }
  }

  function cleanChildren(
    parent: OpNode,
    current: OpNode | OpNode[],
    marker?: OpNode,
    replacement?: OpNode,
  ): OpNode | OpNode[] {
    if (marker === undefined) {
      let removed: OpNode | undefined;
      while ((removed = getFirstChild(parent))) {
        removeNode(parent, removed);
      }
      if (replacement) insertNode(parent, replacement);
      return replacement ?? [];
    }
    const node = replacement || createSlotNode();
    if (Array.isArray(current) && current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = getParentNode(el) === parent;
          if (!inserted && !i) {
            if (isParent) {
              replaceNode(parent, node, el);
            } else {
              insertNode(parent, node, marker);
            }
          } else if (isParent) {
            removeNode(parent, el);
          }
        } else {
          inserted = true;
        }
      }
    } else {
      insertNode(parent, node, marker);
    }
    return [node];
  }

  function appendNodes(parent: OpNode, array: OpNode[], marker?: OpNode): void {
    for (let i = 0, len = array.length; i < len; i++) {
      insertNode(parent, array[i], marker);
    }
  }

  function replaceNode(parent: OpNode, newNode: OpNode, oldNode: OpNode): void {
    insertNode(parent, newNode, oldNode);
    removeNode(parent, oldNode);
  }

  function spreadExpression(
    node: OpNode,
    props: Record<string, unknown>,
    prevProps: Record<string, unknown>,
    skipChildren?: boolean,
  ): void {
    if (!skipChildren) {
      createRenderEffect(
        () => props.children,
        (children) => {
          prevProps.children = insertExpression(node, children, prevProps.children as OpNode);
        },
      );
    }
    createRenderEffect(
      () => {
        const changed: string[] = [];
        for (const prop in props) {
          if (prop === "children" || prop === "ref") continue;
          if (props[prop] !== prevProps[prop]) {
            changed.push(prop);
          }
        }
        return changed;
      },
      (changed) => {
        for (const prop of changed) {
          const value = props[prop];
          setProperty(node, prop, value, prevProps[prop]);
          prevProps[prop] = value;
        }
      },
    );
  }

  return {
    render: (code: () => unknown, root: OpNode): Disposer => {
      let disposer: Disposer;
      createRoot((dispose) => {
        disposer = dispose;
        insert(root, code);
      });
      return disposer!;
    },
    insert,
    spread: (node: OpNode, accessor: unknown, skipChildren?: boolean): void => {
      if (typeof accessor === "function") {
        createRenderEffect(
          () => (accessor as () => Record<string, unknown>)(),
          (props) => spreadExpression(node, props, {}, skipChildren),
        );
      } else {
        spreadExpression(node, accessor as Record<string, unknown>, {}, skipChildren);
      }
    },
    createElement,
    createTextNode,
    insertNode,
    setProp: <T>(node: OpNode, name: string, value: T, prev?: T): T => {
      setProperty(node, name, value, prev);
      return value;
    },
    effect: createRenderEffect,
    memo,
    createComponent: renderComponent,
    mergeProps,
    use: <A, T>(fn: (element: OpNode, arg: A) => T, element: OpNode, arg: A): T => {
      return untrack(() => fn(element, arg));
    },
  };
}
