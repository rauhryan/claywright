/** @jsxImportSource @tui/solid-bindings */
import { describe, expect, test } from "bun:test";
import { createSignal, Errored, flush, fixed, grow, stateful } from "@tui/solid-bindings";
import { createComponent, RootNode, render, renderToString } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { createPreparedTextVirtualItem } from "../src/virtual-scroll/text-items";
import type { VirtualViewportHandle } from "../src/virtual-scroll/types";

const context: AppContext = {
  width: 30,
  height: 8,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds() {
    return { x: 0, y: 2, width: 30, height: 3 };
  },
};

describe("component invocation matrix", () => {
  test("stateful helper preserves local component state across parent rerenders", () => {
    const root = new RootNode();
    const [label, setLabel] = createSignal("idle");
    let bump: (() => void) | undefined;

    const StatefulCounter = stateful(function StatefulCounter() {
      const [count, setCount] = createSignal(0);
      bump = () => setCount((value) => value + 1);
      return <text>Count: {count()}</text>;
    });

    const dispose = render(
      () => (
        <box width={grow()} height={grow()} direction="ttb">
          <text>Label: {label()}</text>
          <StatefulCounter />
        </box>
      ),
      root,
    );

    flush();
    expect(renderToString(root)).toContain("Count: 0");

    bump?.();
    flush();
    expect(renderToString(root)).toContain("Count: 1");

    setLabel("external");
    flush();
    expect(renderToString(root)).toContain("Count: 1");

    dispose();
  });

  test("stateful VirtualViewport and boundary components preserve their respective semantics", async () => {
    const root = new RootNode();
    const [shouldThrow, setShouldThrow] = createSignal(false);
    const [label, setLabel] = createSignal("idle");
    let viewport: VirtualViewportHandle | undefined;

    function MaybeCrash() {
      if (shouldThrow()) {
        throw new Error("boom");
      }
      return <text>Healthy branch</text>;
    }

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box width={grow()} height={grow()} direction="ttb">
                <box height={fixed(1)} width={grow()}>
                  <text>Label: {label()}</text>
                </box>
                <Errored fallback={<text>Fallback branch</text>}>
                  <MaybeCrash />
                </Errored>
                <VirtualViewport
                  id="viewport"
                  ref={(handle) => {
                    viewport = handle;
                  }}
                  height={fixed(3)}
                  initialAutoFollow={false}
                  items={Array.from({ length: 8 }, (_, index) =>
                    createPreparedTextVirtualItem({
                      key: `row-${index + 1}`,
                      text: `Row ${index + 1}`,
                      estimatedElementsPerRow: 1,
                      estimatedMeasuredWords: 1,
                    }),
                  )}
                />
              </box>
            ) as never;
          },
        }),
      root,
    );

    await new Promise((resolve) => queueMicrotask(resolve));
    flush();

    expect(renderToString(root)).toContain("Healthy branch");

    viewport?.scrollBy(2);
    flush();
    expect(viewport?.getState().scrollTop).toBe(2);

    setLabel("external");
    setShouldThrow(true);
    flush();

    expect(renderToString(root)).toContain("Fallback branch");
    expect(viewport?.getState().scrollTop).toBe(2);

    dispose();
  });
});
