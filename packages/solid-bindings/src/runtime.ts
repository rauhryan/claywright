import { createTerm, createInput, open, close, text, grow, type InputEvent, type PointerEvent, type Op } from "clayterm";
import { RootNode, ElementNode, TextNode, type TerminalNode } from "./jsx-runtime";
import { toSizingAxis } from "./render";

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
export type AppReduce = (ctx: AppContext, inputEvents: InputEvent[], pointerEvents: PointerEvent[]) => void;

export async function runApp(
  view: AppView,
  options: AppOptions = {}
): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? 80;
  const height = options.height ?? process.stdout.rows ?? 24;

  const term = await createTerm({ width, height });
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
  }

  function frame() {
    if (cleanedUp) return;
    frameScheduled = false;

    const root = new RootNode();
    const node = view({ width, height, pointer, sendOps });
    
    if (node instanceof TextNode || node instanceof ElementNode) {
      root.children.push(node);
      node.parent = root;
    }

    const ops = nodeToOps(root);
    const { output, events } = term.render(ops, { pointer });

    process.stdout.write(output);
  }

  function scheduleFrame() {
    if (frameScheduled) return;
    frameScheduled = true;
    setImmediate(frame);
  }

  function sendOps(ops: Op[]) {
    const { output } = term.render(ops);
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
      }
      if (event.type === "mouseup") {
        pointer = { x: event.x, y: event.y, down: false };
      }
    }

    scheduleFrame();
  });

  process.stdin.resume();
}

function nodeToOps(node: TerminalNode): Op[] {
  const ops: Op[] = [];

  if (node instanceof RootNode) {
    ops.push(open("root", { layout: { width: grow(), height: grow() } }));
    for (const child of node.children) {
      ops.push(...nodeToOps(child));
    }
    ops.push(close());
  } else if (node instanceof ElementNode) {
    if (node.type === "text") {
      const content = node.children
        .filter((c): c is TextNode => c instanceof TextNode)
        .map((c) => c.value)
        .join("");
      ops.push(text(content, { color: node.props.color as any }));
    } else if (node.type === "box") {
      const props = node.props as any;
      const openProps: any = {};
      
      if (props.width || props.height || props.direction || props.padding || props.gap || props.alignX || props.alignY) {
        openProps.layout = {};
        if (props.width) openProps.layout.width = toSizingAxis(props.width);
        if (props.height) openProps.layout.height = toSizingAxis(props.height);
        if (props.direction) openProps.layout.direction = props.direction;
        if (props.padding) openProps.layout.padding = props.padding;
        if (props.gap !== undefined) openProps.layout.gap = props.gap;
        if (props.alignX !== undefined) openProps.layout.alignX = props.alignX;
        if (props.alignY !== undefined) openProps.layout.alignY = props.alignY;
      }
      
      if (props.bg !== undefined) openProps.bg = props.bg;
      if (props.border) openProps.border = props.border;
      if (props.cornerRadius) openProps.cornerRadius = props.cornerRadius;
      
      ops.push(open(node.id, openProps));
      for (const child of node.children) {
        ops.push(...nodeToOps(child));
      }
      ops.push(close());
    }
  } else if (node instanceof TextNode) {
    ops.push(text(node.value, {}));
  }

  return ops;
}
