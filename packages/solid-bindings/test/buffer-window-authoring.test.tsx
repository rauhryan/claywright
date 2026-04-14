/** @jsxImportSource ../src */
import { describe, expect, test } from "bun:test";
import { createSignal, flush } from "solid-js";
import { ElementOpNode } from "../src/opnode";
import { createComponent, render, renderToString } from "../src/jsx-runtime";
import { AppContextProvider, type AppContext } from "../src/runtime";
import {
  AuthoredBufferWorkspace,
  AuthoredExternalBuffer,
  AuthoredPreparedTextBlock,
  AuthoredPreparedTextBuffer,
  AuthoredTranscriptBuffer,
  AuthoredTranscriptEntry,
  AuthoredWindow,
  createAuthoredWorkspaceCompiler,
  createTextStreamBuffer,
  fixed,
  grow,
  type BufferWindowHandle,
} from "../src";

const context: AppContext = {
  width: 76,
  height: 18,
  pointer: { x: -1, y: -1, down: false },
  sendOps() {},
  requestAnimationFrame() {},
  getElementBounds(id: string) {
    if (id === "main-window") {
      return { x: 0, y: 0, width: 50, height: 8 };
    }
    if (id === "main-window:viewport") {
      return { x: 0, y: 1, width: 50, height: 7 };
    }
    if (id === "float-window") {
      return { x: 12, y: 3, width: 24, height: 6 };
    }
    if (id === "float-window:viewport") {
      return { x: 12, y: 4, width: 24, height: 5 };
    }
    if (id === "inspector-window") {
      return { x: 40, y: 2, width: 30, height: 8 };
    }
    if (id === "inspector-window:viewport") {
      return { x: 40, y: 3, width: 30, height: 7 };
    }
    if (id === "collapsed-window") {
      return { x: 0, y: 8, width: 36, height: 7 };
    }
    if (id === "collapsed-window:viewport") {
      return { x: 0, y: 9, width: 36, height: 6 };
    }
    if (id === "expanded-window") {
      return { x: 38, y: 8, width: 36, height: 7 };
    }
    if (id === "expanded-window:viewport") {
      return { x: 38, y: 9, width: 36, height: 6 };
    }
    return undefined;
  },
};

describe("buffer window authoring", () => {
  test("compiles authored prepared-text buffers and windows into workspace inputs", () => {
    const compiler = createAuthoredWorkspaceCompiler();

    const compiled = compiler.compile([
      (
        <AuthoredPreparedTextBuffer id="inspector" initialAutoFollow={false}>
          <AuthoredPreparedTextBlock key="summary" text="Inspector summary" />
          <AuthoredPreparedTextBlock key="detail" text="Status detail" />
        </AuthoredPreparedTextBuffer>
      ) as never,
      (
        <AuthoredWindow
          id="inspector-window"
          bufferId="inspector"
          mode="docked"
          title="Inspector"
          initialAutoFollow={false}
        />
      ) as never,
    ]);

    expect(compiled.buffers).toHaveLength(1);
    expect(compiled.windows).toHaveLength(1);
    expect(compiled.buffers[0]?.id).toBe("inspector");
    expect(compiled.buffers[0]?.kind).toBe("prepared-text");
    expect(compiled.windows[0]).toMatchObject({
      id: "inspector-window",
      bufferId: "inspector",
      mode: "docked",
      title: "Inspector",
    });
  });

  test("reuses unchanged authored buffers and only recompiles changed siblings", () => {
    const compiler = createAuthoredWorkspaceCompiler();

    const first = compiler.compile([
      (
        <AuthoredPreparedTextBuffer id="left">
          <AuthoredPreparedTextBlock key="l1" text="Left buffer v1" />
        </AuthoredPreparedTextBuffer>
      ) as never,
      (
        <AuthoredPreparedTextBuffer id="right">
          <AuthoredPreparedTextBlock key="r1" text="Right buffer v1" />
        </AuthoredPreparedTextBuffer>
      ) as never,
      (<AuthoredWindow id="left-window" bufferId="left" mode="docked" />) as never,
      (
        <AuthoredWindow
          id="right-window"
          bufferId="right"
          mode="floating"
          floating={{ zIndex: 10 }}
        />
      ) as never,
    ]);

    const second = compiler.compile([
      (
        <AuthoredPreparedTextBuffer id="left">
          <AuthoredPreparedTextBlock key="l1" text="Left buffer v1" />
        </AuthoredPreparedTextBuffer>
      ) as never,
      (
        <AuthoredPreparedTextBuffer id="right">
          <AuthoredPreparedTextBlock key="r1" text="Right buffer v2" />
        </AuthoredPreparedTextBuffer>
      ) as never,
      (<AuthoredWindow id="left-window" bufferId="left" mode="docked" />) as never,
      (
        <AuthoredWindow
          id="right-window"
          bufferId="right"
          mode="floating"
          floating={{ zIndex: 10 }}
        />
      ) as never,
    ]);

    expect(second.buffers[0]).toBe(first.buffers[0]);
    expect(second.buffers[1]).not.toBe(first.buffers[1]);
    expect(second.windows[0]).toBe(first.windows[0]);
    expect(second.windows[1]).toBe(first.windows[1]);
  });

  test("renders transcript buffers with different collapse state in different authored windows", () => {
    const root = new ElementOpNode("root", "root");

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <AuthoredBufferWorkspace>
                <AuthoredTranscriptBuffer id="transcript">
                  <AuthoredTranscriptEntry
                    key="thought"
                    speaker="assistant"
                    kind="thinking"
                    text="Expanded reasoning should remain visible in one window."
                    collapsedSummary="Collapsed reasoning summary"
                  />
                </AuthoredTranscriptBuffer>
                <AuthoredWindow
                  id="collapsed-window"
                  bufferId="transcript"
                  mode="docked"
                  title="Collapsed"
                  viewState={{ collapsedKeys: { thought: true } }}
                />
                <AuthoredWindow
                  id="expanded-window"
                  bufferId="transcript"
                  mode="floating"
                  title="Expanded"
                  viewState={{ collapsedKeys: { thought: false } }}
                  floating={{ zIndex: 20 }}
                />
              </AuthoredBufferWorkspace>
            ) as never;
          },
        }),
      root,
    );

    flush();
    const output = renderToString(root);
    expect(output).toContain("Collapsed reasoning summary");
    expect(output).toContain("Expanded reasoning should remain visible in one window.");

    dispose();
  });

  test("preserves external shared stream identity and unchanged window runtime state across sibling authored updates", async () => {
    const root = new ElementOpNode("root", "root");
    const stream = createTextStreamBuffer({
      id: "shared-stream",
      lines: Array.from({ length: 14 }, (_, index) => `Row ${index + 1}`),
      initialAutoFollow: true,
    });
    const [inspectorRevision, setInspectorRevision] = createSignal(1);

    let mainHandle: BufferWindowHandle | undefined;
    let floatingHandle: BufferWindowHandle | undefined;
    let initialMainHandle: BufferWindowHandle | undefined;
    let initialFloatingHandle: BufferWindowHandle | undefined;

    const dispose = render(
      () =>
        createComponent(AppContextProvider, {
          value: context,
          get children() {
            return (
              <box width={grow()} height={grow()} direction="ttb">
                <AuthoredBufferWorkspace
                  height={fixed(16)}
                  windowProps={{
                    "main-window": {
                      height: fixed(8),
                      ref: (value) => {
                        mainHandle = value;
                        initialMainHandle ??= value;
                      },
                    },
                    "float-window": {
                      width: fixed(24),
                      height: fixed(6),
                      ref: (value) => {
                        floatingHandle = value;
                        initialFloatingHandle ??= value;
                      },
                    },
                    "inspector-window": {
                      width: fixed(30),
                      height: fixed(8),
                    },
                  }}
                >
                  {() => [
                    <AuthoredExternalBuffer buffer={stream} />,
                    <AuthoredPreparedTextBuffer id="inspector">
                      <AuthoredPreparedTextBlock
                        key="summary"
                        text={`Inspector revision ${inspectorRevision()}`}
                      />
                    </AuthoredPreparedTextBuffer>,
                    <AuthoredWindow
                      id="main-window"
                      bufferId="shared-stream"
                      mode="docked"
                      title="Main"
                      initialAutoFollow={false}
                    />,
                    <AuthoredWindow
                      id="float-window"
                      bufferId="shared-stream"
                      mode="floating"
                      title="Float"
                      initialAutoFollow={true}
                      floating={{ zIndex: 30 }}
                    />,
                    <AuthoredWindow
                      id="inspector-window"
                      bufferId="inspector"
                      mode="floating"
                      title="Inspector"
                      floating={{ x: 38, y: 2, zIndex: 40 }}
                    />,
                  ]}
                </AuthoredBufferWorkspace>
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
    expect(floatingHandle?.getState().atEnd).toBe(true);

    const mainScrollTop = mainHandle?.getState().scrollTop ?? 0;
    const floatingScrollTop = floatingHandle?.getState().scrollTop ?? 0;
    expect(floatingScrollTop).toBeGreaterThan(0);

    setInspectorRevision(2);
    flush();
    await new Promise((resolve) => queueMicrotask(resolve));
    flush();

    expect(mainHandle).toBeDefined();
    expect(floatingHandle).toBeDefined();
    expect(initialMainHandle).toBeDefined();
    expect(initialFloatingHandle).toBeDefined();
    expect(mainHandle?.getState().windowId).toBe("main-window");
    expect(floatingHandle?.getState().windowId).toBe("float-window");
    expect(mainHandle?.getState().scrollTop).toBe(mainScrollTop);
    expect(floatingHandle?.getState().scrollTop).toBe(floatingScrollTop);
    expect(renderToString(root)).toContain("Inspector revision 2");

    dispose();
  });

  test("rejects unsupported authored nodes, duplicate ids, and unresolved buffer references", () => {
    const compiler = createAuthoredWorkspaceCompiler();

    expect(() =>
      compiler.compile([
        (
          <AuthoredPreparedTextBuffer id="only">
            <AuthoredPreparedTextBlock key="summary" text="Hello" />
          </AuthoredPreparedTextBuffer>
        ) as never,
        <box width={grow()} />,
      ]),
    ).toThrow(/Unsupported authored workspace child: UI node <box>/);

    expect(() =>
      compiler.compile([
        (
          <AuthoredPreparedTextBuffer id="bad-nesting">
            <AuthoredWindow id="nested-window" bufferId="bad-nesting" mode="docked" />
          </AuthoredPreparedTextBuffer>
        ) as never,
      ]),
    ).toThrow(/Invalid child kind "window" inside prepared-text buffer "bad-nesting"/);

    expect(() =>
      compiler.compile([
        (
          <AuthoredPreparedTextBuffer id="dup">
            <AuthoredPreparedTextBlock key="a" text="One" />
          </AuthoredPreparedTextBuffer>
        ) as never,
        (
          <AuthoredPreparedTextBuffer id="dup">
            <AuthoredPreparedTextBlock key="b" text="Two" />
          </AuthoredPreparedTextBuffer>
        ) as never,
      ]),
    ).toThrow(/Duplicate authored buffer id "dup"/);

    expect(() =>
      compiler.compile([
        (<AuthoredWindow id="missing-window" bufferId="missing" mode="docked" />) as never,
      ]),
    ).toThrow(/references unresolved buffer "missing"/);
  });
});
