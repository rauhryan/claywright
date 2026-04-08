/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { createRenderableTree } from "../src/renderable-tree";
import { RootNode, render } from "../src/jsx-runtime";
import { renderableToOps } from "../src/renderable-to-ops";

function collectTextOpsContent(ops: Array<{ content?: string }>): string[] {
  return ops.map((op) => op.content).filter((value): value is string => typeof value === "string");
}

describe("renderable text refresh", () => {
  test("rebuilt renderable tree sees updated text children", () => {
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

    let renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();
    expect(collectTextOpsContent(renderableToOps(renderable! as never))).toContain("Count: 0");

    const box = root.children[0] as { props: { onClick?: () => void } };
    box.props.onClick?.();
    flush();

    renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();
    expect(collectTextOpsContent(renderableToOps(renderable! as never))).toContain("Count: 1");

    dispose();
  });
});
