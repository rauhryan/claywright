import { describe, expect, test } from "bun:test";
import { close, createTerm, fixed, grow, open, type Op } from "clayterm";
import { createComponent, render } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { createPreparedTextVirtualItem } from "../src/virtual-scroll/text-items";
import { ElementOpNode } from "../src/opnode";
import { createRenderableTree } from "../src/renderable-tree";
import { renderableToOps } from "../src/renderable-to-ops";

const context: AppContext = {
  width: 30,
  height: 12,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds() {
    return undefined;
  },
};

describe("virtual viewport pointer integration", () => {
  test("emits pointer target ids for the viewport", async () => {
    const root = new ElementOpNode("root", "root");
    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box width={grow()} height={grow()} direction="ttb">
                <box id="probe" width={grow()} height={fixed(1)}>
                  <text>Title</text>
                </box>
                <VirtualViewport
                  id="viewport"
                  initialAutoFollow={false}
                  bg={0xff101010}
                  items={Array.from({ length: 5 }, (_, index) => createPreparedTextVirtualItem({
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

    const renderable = createRenderableTree(root);
    expect(renderable).not.toBeNull();
    const viewportRenderable = renderable?.getRenderableById("viewport");
    expect(viewportRenderable?.focusable).toBe(true);
    const ops: Op[] = renderable ? renderableToOps(renderable) : [open("root"), close()];

    const term = await createTerm({ width: 30, height: 12 });
    const result = term.render(ops, { pointer: { x: 0, y: 2, down: false } });

    expect(result.events.some((event) => event.id === "viewport")).toBe(true);

    dispose();
  });
});
