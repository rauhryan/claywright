import { createInput, type InputEvent, type PointerEvent, type Op } from "clayterm";
import { Renderer } from "@tui/core";
import { RootNode, ElementNode, TextNode, resetNodeIds, type TerminalNode } from "./jsx-runtime";
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

export type AppView = (ctx: AppContext) => TerminalNode;
export type AppReduce = (
  ctx: AppContext,
  inputEvents: InputEvent[],
  pointerEvents: PointerEvent[],
) => void;

export async function runApp(view: AppView, options: AppOptions = {}): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? 80;
  const height = options.height ?? process.stdout.rows ?? 24;

  const renderer = new Renderer({ width, height });
  await renderer.init();
  const input = await createInput();

  let pointer = { x: -1, y: -1, down: false };
  let cleanedUp = false;
  let frameScheduled = false;

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;

    if (process.stdout.isTTY) {
      process.stdout.write("\x1b[?25h\x1b[?1006l\x1b[?1003l\x1b[?1049l");
    }

    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
      process.stdin.setRawMode(false);
    }

    renderer.destroy();
  }

  function frame(allowRerender = true) {
    if (cleanedUp) return;
    frameScheduled = false;

    resetNodeIds();
    const root = new RootNode();
    const node = view({ width, height, pointer, sendOps });

    if (node instanceof TextNode || node instanceof ElementNode) {
      root.children.push(node);
      node.parent = root;
    }

    const rootRenderable = createRenderableTree(root);
    if (rootRenderable) {
      renderer.setRoot(rootRenderable);
    }

    const ops = rootRenderable ? renderableToOps(rootRenderable) : [];
    const output = renderer.render(ops, pointer);

    process.stdout.write(output);

    if (allowRerender && renderer.lastPointerEvents.length > 0) {
      frame(false);
    }
  }

  function scheduleFrame() {
    if (frameScheduled) return;
    frameScheduled = true;
    setImmediate(frame);
  }

  function sendOps(ops: Op[]) {
    const output = renderer.render(ops, pointer);
    process.stdout.write(output);
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

  process.stdin.on("data", (buf) => {
    const result = input.scan(new Uint8Array(buf));
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
        pointer = { x: event.x, y: event.y, down: pointer.down };
      }
      if (event.type === "mousedown") {
        pointer = { x: event.x, y: event.y, down: true };
        renderer.beginPointerPress();
        frame();
      }
      if (event.type === "mouseup") {
        pointer = { x: event.x, y: event.y, down: false };
      }
    }

    renderer.handleInput(new Uint8Array(buf));

    scheduleFrame();
  });

  process.stdin.resume();
}
