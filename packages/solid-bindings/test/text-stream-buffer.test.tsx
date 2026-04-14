import { describe, expect, test } from "bun:test";
import { flush } from "solid-js";
import { createComponent, render, renderToString } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import { ElementOpNode } from "../src/opnode";
import {
  BufferWindow,
  createTextStreamBuffer,
  fixed,
  grow,
  type BufferWindowHandle,
  type TextStreamBufferModel,
} from "../src";

const context: AppContext = {
  width: 48,
  height: 16,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds(id: string) {
    if (id === "main") {
      return { x: 0, y: 0, width: 48, height: 8 };
    }
    if (id === "main:viewport") {
      return { x: 0, y: 1, width: 48, height: 7 };
    }
    if (id === "float") {
      return { x: 12, y: 3, width: 24, height: 6 };
    }
    if (id === "float:viewport") {
      return { x: 12, y: 4, width: 24, height: 5 };
    }
    return undefined;
  },
};

describe("text stream buffer", () => {
  test("maintains maxLines as a shared ring snapshot", () => {
    const buffer = createTextStreamBuffer({
      id: "stream",
      maxLines: 3,
      lines: ["Line 1", "Line 2"],
    });

    const initial = buffer.getSnapshot();
    expect(initial.baseIndex).toBe(0);
    expect(initial.lines).toEqual(["Line 1", "Line 2"]);

    const third = buffer.appendLine("Line 3");
    const fourth = buffer.appendLine("Line 4");
    const snapshot = buffer.getSnapshot();

    expect(third).toBe(2);
    expect(fourth).toBe(3);
    expect(snapshot.baseIndex).toBe(1);
    expect(snapshot.lines).toEqual(["Line 2", "Line 3", "Line 4"]);
    expect(snapshot.version).not.toBe(initial.version);
  });

  test("reactively renders appended stream lines through BufferWindow", () => {
    const root = new ElementOpNode("root", "root");
    const buffer = createTextStreamBuffer({
      id: "stream-window",
      lines: ["BEGIN", "Line 1", "Line 2"],
      initialAutoFollow: false,
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
                  bufferId: "stream-window",
                  mode: "docked",
                  title: "Stream",
                  initialAutoFollow: false,
                }}
              />
            ) as never;
          },
        }),
      root,
    );

    flush();
    expect(renderToString(root)).toContain("BEGIN");
    expect(renderToString(root)).toContain("Line 1");

    buffer.appendLines(["Line 3", "END"]);
    flush();

    expect(renderToString(root)).toContain("Line 3");
    expect(renderToString(root)).toContain("END");

    dispose();
  });

  test("supports shared buffers with independent window-local scroll/follow state", async () => {
    const root = new ElementOpNode("root", "root");
    const buffer: TextStreamBufferModel = createTextStreamBuffer({
      id: "shared-stream",
      lines: Array.from({ length: 12 }, (_, index) => `Row ${index + 1}`),
      initialAutoFollow: true,
    });
    let mainHandle: BufferWindowHandle | undefined;
    let floatingHandle: BufferWindowHandle | undefined;

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box width={grow()} height={grow()} direction="ttb">
                <BufferWindow
                  buffer={buffer}
                  window={{
                    id: "main",
                    bufferId: "shared-stream",
                    mode: "docked",
                    title: "Main",
                    initialAutoFollow: false,
                  }}
                  height={fixed(8)}
                  ref={(value) => {
                    mainHandle = value;
                  }}
                />
                <BufferWindow
                  buffer={buffer}
                  window={{
                    id: "float",
                    bufferId: "shared-stream",
                    mode: "floating",
                    title: "Float",
                    initialAutoFollow: true,
                    floating: { zIndex: 10 },
                  }}
                  width={fixed(24)}
                  height={fixed(6)}
                  ref={(value) => {
                    floatingHandle = value;
                  }}
                />
              </box>
            ) as never;
          },
        }),
      root,
    );

    flush();
    await new Promise((resolve) => queueMicrotask(resolve));
    flush();
    expect(mainHandle).toBeDefined();
    expect(floatingHandle).toBeDefined();
    expect(mainHandle?.getState().scrollTop).toBe(0);
    expect(floatingHandle?.getState().scrollTop).toBe(7);
    expect(floatingHandle?.getState().atEnd).toBe(true);

    const mainScrollTop = mainHandle?.getState().scrollTop ?? 0;
    const floatingScrollTop = floatingHandle?.getState().scrollTop ?? 0;

    buffer.appendLine("Tail row");
    flush();
    await new Promise((resolve) => queueMicrotask(resolve));
    flush();

    expect(mainHandle?.getState().scrollTop).toBe(mainScrollTop);
    expect(floatingHandle?.getState().scrollTop).toBe(8);
    expect(floatingHandle?.getState().atEnd).toBe(true);
    expect(floatingHandle?.getState().scrollTop ?? 0).toBeGreaterThan(floatingScrollTop);

    dispose();
  });
});
