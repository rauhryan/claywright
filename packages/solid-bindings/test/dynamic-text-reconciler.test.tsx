/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import {
  RootNode,
  createElement,
  createTextNode,
  insert,
  insertNode,
  render,
  type TerminalNode,
} from "../src/jsx-runtime";

function collectTextContent(node: TerminalNode): string {
  const parts: string[] = [];

  function walk(current: TerminalNode): void {
    if (current.type === "text-node") {
      parts.push((current as { value?: string }).value ?? "");
    }

    for (const child of current.children) {
      walk(child);
    }
  }

  walk(node);
  return parts.join("");
}

describe("dynamic text reconciliation", () => {
  test("preserves static text when dynamic accessor is inserted after it", () => {
    const [count, setCount] = createSignal(0);
    const root = new RootNode();
    const text = createElement("text");
    const staticText = createTextNode("Count: ");

    insertNode(text, staticText);
    insert(text, count, null);
    insertNode(root, text);

    expect(
      root.children[0]?.children.map((child) => ({
        type: child.type,
        value: (child as { value?: string }).value,
      })),
    ).toEqual([
      { type: "text-node", value: "Count: " },
      { type: "text-node", value: "0" },
    ]);
    expect(collectTextContent(root)).toBe("Count: 0");

    setCount(1);
    flush();

    expect(collectTextContent(root)).toBe("Count: 1");
  });

  test("updates text children inserted by Solid universal transform shape", () => {
    const [count, setCount] = createSignal(0);
    const root = new RootNode();

    const dispose = render(() => <text>Count: {count()}</text>, root);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]?.type).toBe("text");
    expect(
      root.children[0]?.children.map((child) => ({
        type: child.type,
        value: (child as { value?: string }).value,
      })),
    ).toEqual([
      { type: "text-node", value: "Count: " },
      { type: "text-node", value: "0" },
    ]);
    expect(collectTextContent(root)).toBe("Count: 0");

    setCount(1);
    flush();

    expect(collectTextContent(root)).toBe("Count: 1");

    dispose();
  });
});
