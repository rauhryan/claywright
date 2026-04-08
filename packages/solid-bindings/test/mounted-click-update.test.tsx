/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { RootNode, render, type TerminalNode } from "../src/jsx-runtime";

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

describe("mounted click-driven updates", () => {
  test("updating state from onClick mutates mounted OpNode text", () => {
    const [count, setCount] = createSignal(0);
    const root = new RootNode();

    const dispose = render(
      () => (
        <box onClick={() => setCount((value) => value + 1)}>
          <text>Count: {count()}</text>
        </box>
      ),
      root,
    );

    expect(collectTextContent(root)).toBe("Count: 0");

    const box = root.children[0] as { props: { onClick?: () => void } };
    box.props.onClick?.();
    flush();

    expect(collectTextContent(root)).toBe("Count: 1");

    dispose();
  });
});
