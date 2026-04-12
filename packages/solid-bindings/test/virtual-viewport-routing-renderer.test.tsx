import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { createComponent, render } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { createPreparedTextVirtualItem } from "../src/virtual-scroll/text-items";
import { ElementOpNode } from "../src/opnode";
import { createRenderableTree } from "../src/renderable-tree";
import { renderableToOps } from "../src/renderable-to-ops";
import { Renderer } from "@tui/core";
import { fixed, grow } from "clayterm";

const context: AppContext = {
  width: 40,
  height: 10,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds() {
    return undefined;
  },
};

describe("virtual viewport routing via renderer", () => {
  test("renderer click targeting updates sibling box signal", async () => {
    const [status, setStatus] = createSignal("idle");
    const root = new ElementOpNode("root", "root");
    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box width={grow()} height={grow()} direction="ttb">
                <box
                  id="box-target"
                  width={fixed(20)}
                  height={fixed(3)}
                  onClick={() => setStatus("click")}
                >
                  <text>Target box</text>
                </box>
                <VirtualViewport
                  id="viewport"
                  height={fixed(3)}
                  initialAutoFollow={false}
                  items={Array.from({ length: 3 }, (_, index) => createPreparedTextVirtualItem({
                    key: `row-${index + 1}`,
                    text: `Row ${index + 1}`,
                    estimatedElementsPerRow: 1,
                    estimatedMeasuredWords: 1,
                  }))}
                />
              </box>
            ) as never;
          },
        }),
      root,
    );

    const renderable = createRenderableTree(root)!;
    const renderer = new Renderer({ width: 40, height: 10 });
    await renderer.init();
    renderer.setRoot(renderable);
    expect(renderer.findRenderable("box-target")).toBeDefined();

    (
      renderer as unknown as {
        handlePointerEvent(event: { type: "pointerclick"; id: string; x: number; y: number }): void;
      }
    ).handlePointerEvent({ type: "pointerclick", id: "box-target", x: 1, y: 3 });
    flush();

    expect(status()).toBe("click");

    dispose();
  });

  test("renderer wheel targeting updates viewport signal", async () => {
    const [status, setStatus] = createSignal("idle");
    const root = new ElementOpNode("root", "root");
    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <VirtualViewport
                id="viewport"
                height={fixed(3)}
                initialAutoFollow={false}
                onWheel={() => setStatus("wheel")}
                items={Array.from({ length: 6 }, (_, index) => createPreparedTextVirtualItem({
                  key: `row-${index + 1}`,
                  text: `Row ${index + 1}`,
                  estimatedElementsPerRow: 1,
                  estimatedMeasuredWords: 1,
                }))}
              />
            ) as never;
          },
        }),
      root,
    );

    const renderable = createRenderableTree(root)!;
    const renderer = new Renderer({ width: 40, height: 10 });
    await renderer.init();
    renderer.setRoot(renderable);
    const ops = renderableToOps(renderable);
    renderer.hoveredRenderables = [renderable.getRenderableById("viewport")!];

    const encoder = new TextEncoder();
    renderer.handleInput(encoder.encode("\x1b[<65;2;4M"));
    flush();

    expect(status()).toBe("wheel");

    dispose();
  });
});
