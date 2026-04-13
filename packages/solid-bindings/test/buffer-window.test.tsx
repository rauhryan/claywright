import { describe, expect, test } from "bun:test";
import { flush } from "solid-js";
import { createComponent, render, renderToString } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { ElementOpNode } from "../src/opnode";
import {
  ATTACH_POINT,
  ATTACH_TO,
  BufferWindow,
  createPreparedTextBuffer,
  type BufferWindowHandle,
} from "../src";

const context: AppContext = {
  width: 48,
  height: 16,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds(id: string) {
    if (id === "main:viewport") {
      return { x: 0, y: 1, width: 46, height: 10 };
    }
    if (id === "float:viewport") {
      return { x: 8, y: 4, width: 24, height: 6 };
    }
    return undefined;
  },
};

describe("BufferWindow", () => {
  test("wraps viewport state with window metadata and delegates scrolling", () => {
    const root = new ElementOpNode("root", "root");
    const buffer = createPreparedTextBuffer({
      id: "buffer-1",
      blocks: Array.from({ length: 18 }, (_, index) => ({
        key: `row-${index + 1}`,
        text: `Row ${index + 1}`,
        estimatedElementsPerRow: 1,
        estimatedMeasuredWords: 1,
      })),
    });
    let handle: BufferWindowHandle | undefined;

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <BufferWindow
                buffer={buffer}
                window={{
                  id: "main",
                  bufferId: "buffer-1",
                  mode: "docked",
                  title: "Main window",
                  showTrack: true,
                }}
                ref={(value) => {
                  handle = value;
                }}
              />
            ) as never;
          },
        }),
      root,
    );

    flush();
    expect(handle).toBeDefined();
    expect(handle?.getState().windowId).toBe("main");
    expect(handle?.getState().bufferId).toBe("buffer-1");
    expect(handle?.getState().mode).toBe("docked");
    expect(handle?.getState().bufferKind).toBe("prepared-text");

    handle?.scrollBy(2);
    flush();
    expect(handle?.getState().scrollTop).toBe(2);

    dispose();
  });

  test("applies floating configuration for floating windows", () => {
    const root = new ElementOpNode("root", "root");
    const buffer = createPreparedTextBuffer({
      id: "buffer-2",
      blocks: [{ key: "only", text: "Floating window body" }],
    });

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <BufferWindow
                buffer={buffer}
                window={{
                  id: "float",
                  bufferId: "buffer-2",
                  mode: "floating",
                  title: "Floating",
                  floating: {
                    attachPoints: {
                      element: ATTACH_POINT.CENTER_CENTER,
                      parent: ATTACH_POINT.CENTER_CENTER,
                    },
                    zIndex: 40,
                  },
                }}
              />
            ) as never;
          },
        }),
      root,
    );

    flush();
    const outer = root.children[0] as ElementOpNode;
    expect(outer.props.floating).toEqual({
      attachTo: ATTACH_TO.ROOT,
      attachPoints: {
        element: ATTACH_POINT.CENTER_CENTER,
        parent: ATTACH_POINT.CENTER_CENTER,
      },
      pointerCaptureMode: 0,
      zIndex: 40,
    });

    dispose();
  });

  test("renders an explicit unresolved-buffer state when buffer ids do not match", () => {
    const root = new ElementOpNode("root", "root");
    const buffer = createPreparedTextBuffer({
      id: "buffer-3",
      blocks: [{ key: "only", text: "Mismatch" }],
    });

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <BufferWindow
                buffer={buffer}
                window={{
                  id: "main",
                  bufferId: "missing-buffer",
                  mode: "split",
                  title: "Broken",
                }}
              />
            ) as never;
          },
        }),
      root,
    );

    flush();
    expect(renderToString(root)).toContain("Unresolved buffer: missing-buffer");

    dispose();
  });
});
