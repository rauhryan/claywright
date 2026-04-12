import { describe, expect, test } from "bun:test";
import { flush } from "solid-js";
import { createComponent, render } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { VirtualViewport } from "../src/virtual-scroll/VirtualViewport";
import { createPreparedTextVirtualItem } from "../src/virtual-scroll/text-items";
import type { VirtualViewportHandle } from "../src/virtual-scroll/types";
import { ElementOpNode } from "../src/opnode";

const context: AppContext = {
  width: 30,
  height: 12,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds(id: string) {
    if (id === "viewport") {
      return { x: 0, y: 0, width: 30, height: 6 };
    }
    return undefined;
  },
};

describe("virtual viewport handle", () => {
  test("scrollBy and scrollToLatest update public state", () => {
    const root = new ElementOpNode("root", "root");
    let handle: VirtualViewportHandle | undefined;

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <VirtualViewport
                id="viewport"
                initialAutoFollow={false}
                ref={(value) => {
                  handle = value;
                }}
                items={Array.from({ length: 20 }, (_, index) => createPreparedTextVirtualItem({
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

    flush();
    expect(handle).toBeDefined();
    expect(handle?.getState().scrollTop).toBe(0);

    handle?.scrollBy(3);
    flush();
    expect(handle?.getState().scrollTop).toBe(3);
    expect(handle?.getState().autoFollow).toBe(false);

    handle?.scrollToLatest();
    flush();
    expect(handle?.getState().atEnd).toBe(true);
    expect(handle?.getState().autoFollow).toBe(true);

    dispose();
  });
});
