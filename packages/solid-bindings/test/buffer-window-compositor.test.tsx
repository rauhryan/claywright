import { describe, expect, test } from "bun:test";
import { flush } from "solid-js";
import { createComponent, render, renderToString } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { ElementOpNode } from "../src/opnode";
import {
  ATTACH_POINT,
  BufferWorkspace,
  createPreparedTextBuffer,
  partitionBufferWindowSurfaces,
  resolveActiveWindowId,
  resolveBufferWindowSurfaces,
} from "../src";

const context: AppContext = {
  width: 60,
  height: 20,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds(id: string) {
    if (id === "left:viewport") return { x: 0, y: 0, width: 28, height: 8 };
    if (id === "right:viewport") return { x: 30, y: 0, width: 28, height: 8 };
    if (id === "float:viewport") return { x: 18, y: 4, width: 24, height: 5 };
    return undefined;
  },
};

describe("buffer-window compositor", () => {
  test("partitions docked and floating windows and sorts floating windows by z-index", () => {
    const buffers = [
      createPreparedTextBuffer({ id: "left-buffer", blocks: [{ key: "l", text: "Left" }] }),
      createPreparedTextBuffer({ id: "right-buffer", blocks: [{ key: "r", text: "Right" }] }),
      createPreparedTextBuffer({ id: "float-a-buffer", blocks: [{ key: "a", text: "Float A" }] }),
      createPreparedTextBuffer({ id: "float-b-buffer", blocks: [{ key: "b", text: "Float B" }] }),
    ];
    const windows = [
      { id: "left", bufferId: "left-buffer", mode: "split" as const },
      { id: "right", bufferId: "right-buffer", mode: "docked" as const },
      {
        id: "float-a",
        bufferId: "float-a-buffer",
        mode: "floating" as const,
        floating: { zIndex: 50 },
      },
      {
        id: "float-b",
        bufferId: "float-b-buffer",
        mode: "floating" as const,
        floating: { zIndex: 10 },
      },
    ];

    const surfaces = resolveBufferWindowSurfaces(buffers, windows);
    const { docked, floating } = partitionBufferWindowSurfaces(surfaces);

    expect(docked.map((surface) => surface.window.id)).toEqual(["left", "right"]);
    expect(floating.map((surface) => surface.window.id)).toEqual(["float-b", "float-a"]);
  });

  test("resolves the active window from preferred/current candidates", () => {
    const windows = [
      { id: "left", bufferId: "left-buffer", mode: "split" as const },
      { id: "right", bufferId: "right-buffer", mode: "docked" as const },
      {
        id: "palette",
        bufferId: "palette-buffer",
        mode: "floating" as const,
        focusable: false,
      },
    ];

    expect(resolveActiveWindowId(windows, undefined, "right")).toBe("right");
    expect(resolveActiveWindowId(windows, "left", "right")).toBe("left");
    expect(resolveActiveWindowId(windows, "missing", "missing")).toBe("left");
  });

  test("workspace renders docked windows plus floating overlays from shared window state", () => {
    const root = new ElementOpNode("root", "root");
    const buffers = [
      createPreparedTextBuffer({
        id: "left-buffer",
        blocks: [{ key: "l", text: "Left pane body" }],
      }),
      createPreparedTextBuffer({
        id: "right-buffer",
        blocks: [{ key: "r", text: "Right pane body" }],
      }),
      createPreparedTextBuffer({
        id: "float-buffer",
        blocks: [{ key: "f", text: "Floating pane body" }],
      }),
    ];

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <BufferWorkspace
                buffers={buffers}
                windows={[
                  {
                    id: "left",
                    bufferId: "left-buffer",
                    mode: "split",
                    title: "Left",
                  },
                  {
                    id: "right",
                    bufferId: "right-buffer",
                    mode: "split",
                    title: "Right",
                  },
                  {
                    id: "float",
                    bufferId: "float-buffer",
                    mode: "floating",
                    title: "Float",
                    floating: {
                      attachPoints: {
                        element: ATTACH_POINT.LEFT_TOP,
                        parent: ATTACH_POINT.LEFT_TOP,
                      },
                      x: 18,
                      y: 4,
                      zIndex: 25,
                    },
                  },
                ]}
                direction="ltr"
                gap={1}
              />
            ) as never;
          },
        }),
      root,
    );

    flush();

    const workspace = root.children[0] as ElementOpNode;
    const [left, right, floating] = workspace.children as ElementOpNode[];

    expect(left.id).toBe("left");
    expect(right.id).toBe("right");
    expect(floating.id).toBe("float");
    expect(floating.props.floating).toEqual({
      attachTo: 3,
      attachPoints: {
        element: ATTACH_POINT.LEFT_TOP,
        parent: ATTACH_POINT.LEFT_TOP,
      },
      pointerCaptureMode: 0,
      x: 18,
      y: 4,
      zIndex: 25,
    });
    expect(renderToString(root)).toContain("Floating pane body");

    dispose();
  });
});
