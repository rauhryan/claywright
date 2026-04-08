/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { RootNode, render } from "../src/jsx-runtime";

describe("runtime-like invalidation", () => {
  test("click-driven state update marks root dirty after clean pass", () => {
    const [count, setCount] = createSignal(0);
    const root = new RootNode();
    let invalidations = 0;

    root.setInvalidationListener(() => {
      invalidations += 1;
    });

    const dispose = render(
      () => (
        <box onClick={() => setCount((value) => value + 1)}>
          <text>Count: {count()}</text>
        </box>
      ),
      root,
    );

    root.markClean();
    root.children[0]?.markClean();
    root.children[0]?.children[0]?.markClean();
    root.children[0]?.children[0]?.children[0]?.markClean();
    root.children[0]?.children[0]?.children[1]?.markClean();
    invalidations = 0;

    const box = root.children[0] as { props: { onClick?: () => void } };
    box.props.onClick?.();
    flush();

    expect(root.isDirty).toBe(true);
    expect(invalidations).toBeGreaterThan(0);

    dispose();
  });
});
