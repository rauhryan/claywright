import { describe, expect, test } from "bun:test";
import { createSignal } from "solid-js";
import { close, createTerm, fixed, grow, open } from "clayterm";
import { createComponent, render } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { ElementOpNode } from "../src/opnode";
import { createRenderableTree } from "../src/renderable-tree";
import { renderableToOps } from "../src/renderable-to-ops";

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

describe("virtual viewport routing hit test", () => {
  test("term hit testing sees the visual box and viewport regions", async () => {
    const [boxStatus] = createSignal("idle");
    const [viewportStatus] = createSignal("idle");
    const root = new ElementOpNode("root", "root");
    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box bg={0xff0a0e16} width={grow()} height={grow()} direction="ttb">
                <box height={fixed(1)} width={grow()}>
                  <text>Virtual Viewport Routing Demo</text>
                </box>
                <box height={fixed(1)} width={grow()}>
                  <text>Box: {boxStatus()}</text>
                </box>
                <box height={fixed(1)} width={grow()}>
                  <text>Viewport: {viewportStatus()}</text>
                </box>
                <box id="box-target" width={fixed(20)} height={fixed(3)}>
                  <text>Target box</text>
                </box>
                <VirtualViewport
                  id="viewport"
                  height={fixed(3)}
                  initialAutoFollow={false}
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

    const renderable = createRenderableTree(root)!;
    const innerOps = renderableToOps(renderable);
    const ops = [open("root", { layout: { width: grow(), height: grow() } }), ...innerOps, close()];
    const term = await createTerm({ width: 40, height: 10 });

    term.render(ops, { pointer: { x: 0, y: 0, down: false } });
    const boxBounds = term.getElementBounds("box-target");
    const viewportBounds = term.getElementBounds("viewport");
    expect(boxBounds).toEqual({ x: 0, y: 3, width: 20, height: 3 });
    expect(viewportBounds).toEqual({ x: 0, y: 6, width: 40, height: 3 });

    const boxResult = term.render(ops, { pointer: { x: 1, y: 3, down: false } });
    expect(boxResult.events.some((event) => event.id === "box-target")).toBe(true);

    const viewportResult = term.render(ops, { pointer: { x: 1, y: 6, down: false } });
    expect(viewportResult.events.some((event) => event.id === "viewport")).toBe(true);

    dispose();
  });
});
