import { describe, expect, test } from "bun:test";
import { createSignal } from "solid-js";
import { fixed, grow } from "../src/index";
import { createComponent, render } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { ElementOpNode } from "../src/opnode";
import { createRenderableTree } from "../src/renderable-tree";

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

describe("virtual viewport routing tree", () => {
  test("renderable tree contains sibling box and viewport", () => {
    const [boxStatus, setBoxStatus] = createSignal("idle");
    const [viewportStatus, setViewportStatus] = createSignal("idle");
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
                  onClick={() => setBoxStatus("click")}
                >
                  <text>Target box</text>
                </box>
                <VirtualViewport
                  id="viewport"
                  height={fixed(3)}
                  initialAutoFollow={false}
                  onClick={() => setViewportStatus("click")}
                  items={Array.from({ length: 3 }, (_, index) => ({
                    key: `row-${index + 1}`,
                    version: 1,
                    measure: () => ({ height: 1, estimatedElements: 1, estimatedMeasuredWords: 1 }),
                    render: () => `Row ${index + 1}` as never,
                  }))}
                />
              </box>
            ) as never;
          },
        }),
      root,
    );

    const renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();
    expect(renderable?.getRenderableById("box-target")).toBeDefined();
    expect(renderable?.getRenderableById("viewport")).toBeDefined();

    dispose();
  });
});
