import {
  createInput,
  close,
  grow,
  open,
  type InputEvent,
  type Op,
  type PointerEvent,
} from "clayterm";
import { createSignal, flush } from "solid-js";
import { Renderer } from "@tui/core";
import { render as mountSolid } from "./jsx-runtime";
import { ElementOpNode, OpNode } from "./opnode";
import { createRenderableTree } from "./reconciler";
import { renderableToOps } from "./renderable-to-ops";

export interface AppOptions {
  width?: number;
  height?: number;
}

export interface AppContext {
  width: number;
  height: number;
  pointer: { x: number; y: number; down: boolean };
  sendOps: (ops: Op[]) => void;
}

export type AppView = (ctx: AppContext) => unknown;
export type AppReduce = (
  ctx: AppContext,
  inputEvents: InputEvent[],
  pointerEvents: PointerEvent[],
) => void;

function clearDirty(node: OpNode): void {
  node.markClean();
  for (const child of node.children) {
    clearDirty(child);
  }
}

export async function runApp(view: AppView, options: AppOptions = {}): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? Number(process.env.COLUMNS ?? 80);
  const height = options.height ?? process.stdout.rows ?? Number(process.env.LINES ?? 24);

  const renderer = new Renderer({ width, height });
  await renderer.init();
  const input = await createInput();

  const [getPointer, setPointer] = createSignal({ x: -1, y: -1, down: false });
  let cleanedUp = false;
  let frameScheduled = false;
  let frameInProgress = false;
  let frameInvalidatedDuringPass = false;

  const pointer = {
    get x() {
      return getPointer().x;
    },
    get y() {
      return getPointer().y;
    },
    get down() {
      return getPointer().down;
    },
  };

  // Create persistent root once — mounted for the app's entire lifetime
  const rootOpNode = new ElementOpNode("root", "root");

  // Mounted signal writes, boundary settlement, and async sources all flow
  // through OpNode invalidation. Coalesce them into a single scheduled frame.
  function scheduleFrame() {
    if (cleanedUp) return;
    if (frameInProgress) {
      frameInvalidatedDuringPass = true;
      return;
    }
    if (frameScheduled) return;
    frameScheduled = true;
    setImmediate(frame);
  }

  rootOpNode.setInvalidationListener(scheduleFrame);

  function sendOps(ops: Op[]) {
    const output = renderer.render(ops, getPointer());
    process.stdout.write(output);
  }

  // Mount Solid tree once; reactive signals drive in-place OpNode mutations
  const ctx: AppContext = {
    width,
    height,
    pointer,
    sendOps,
  };
  const dispose = mountSolid(() => view(ctx), rootOpNode);

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    rootOpNode.setInvalidationListener(undefined);

    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25h\x1b[?1006l\x1b[?1003l\x1b[?1049l");
    }

    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
      process.stdin.setRawMode(false);
    }

    dispose();
    renderer.destroy();
  }

  function collectOps(node: OpNode): Op[] {
    const ops: Op[] = [open("root", { layout: { width: grow(), height: grow() } })];
    for (const child of node.children) {
      ops.push(...child.toOps());
    }
    ops.push(close());
    return ops;
  }

  function renderFramePass(allowRerender: boolean): boolean {
    frameInvalidatedDuringPass = false;

    // Async signal writes re-run Solid effects independently; each render pass
    // flushes pending work into the persistent OpNode tree before serialization.
    flush();

    const rootRenderable = createRenderableTree(rootOpNode);
    if (rootRenderable) {
      renderer.setRoot(rootRenderable);
    }

    const ops = rootRenderable ? renderableToOps(rootRenderable) : collectOps(rootOpNode);
    clearDirty(rootOpNode);

    const output = renderer.render(ops, getPointer());
    process.stdout.write(output);

    // Pointer and keyboard handlers can synchronously write signals during render.
    // Flush them here so the mounted OpNode tree reflects event-driven updates
    // before deciding whether another pass is required.
    flush();

    return (
      allowRerender &&
      (renderer.lastPointerEvents.length > 0 || frameInvalidatedDuringPass || rootOpNode.isDirty)
    );
  }

  function frame() {
    if (cleanedUp) return;
    frameScheduled = false;

    if (frameInProgress) {
      frameInvalidatedDuringPass = true;
      return;
    }

    frameInProgress = true;

    try {
      let allowRerender = true;
      while (renderFramePass(allowRerender)) {
        allowRerender = false;
      }
    } finally {
      frameInProgress = false;
    }

    if (frameInvalidatedDuringPass || rootOpNode.isDirty) {
      scheduleFrame();
    }
  }

  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1049h\x1b[?1003h\x1b[?1006h\x1b[?25l");
  }

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(true);
  }

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exit(130);
  });

  frame();

  process.stdin.on("data", (buf: Buffer) => {
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    const result = input.scan(bytes);
    const { events } = result;

    for (const event of events) {
      if (event.type === "keydown" && event.ctrl && event.key.toLowerCase() === "c") {
        cleanup();
        process.exit(130);
      }
      if (event.type === "keydown" && event.key.toLowerCase() === "q") {
        cleanup();
        process.exit(0);
      }
    }

    for (const event of events) {
      if (event.type === "mousemove") {
        setPointer({ x: event.x, y: event.y, down: getPointer().down });
      }
      if (event.type === "mousedown") {
        setPointer({ x: event.x, y: event.y, down: true });
        renderer.beginPointerPress();
        frame();
      }
      if (event.type === "mouseup") {
        setPointer({ x: event.x, y: event.y, down: false });
      }
    }

    renderer.handleInput(bytes);
    scheduleFrame();
  });

  process.stdin.resume();
}
