import { describe, expect, test } from "bun:test";
import { close, fixed, grow, open, type Op } from "clayterm";
import { MouseEvent, Renderable, Renderer, WheelEvent } from "../src/index.js";

class TestRenderable extends Renderable {}

const encoder = new TextEncoder();

function mouseDownAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<0;${x + 1};${y + 1}M`);
}

function mouseUpAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<0;${x + 1};${y + 1}m`);
}

function mouseMoveAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<35;${x + 1};${y + 1}M`);
}

function wheelDownAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<65;${x + 1};${y + 1}M`);
}

describe("renderer pointer/input parity", () => {
  test("render-derived click and scanned mouse/wheel input target the same renderable", async () => {
    const renderer = new Renderer({ width: 20, height: 6 });
    await renderer.init();

    const root = new TestRenderable({ id: "root" });
    const child = new TestRenderable({ id: "target" });
    root.add(child);

    const received: string[] = [];
    child.onClick = () => received.push("click");
    child.onMouseMove = (event: MouseEvent) => received.push(`move:${event.x},${event.y}`);
    child.onMouseDown = (event: MouseEvent) => received.push(`down:${event.button}`);
    child.onMouseUp = (event: MouseEvent) => received.push(`up:${event.button}`);
    child.onWheel = (event: WheelEvent) => received.push(`wheel:${event.direction}`);

    renderer.setRoot(root);

    const ops: Op[] = [
      open("root", { layout: { width: grow(), height: grow() } }),
      open("target", { layout: { width: fixed(10), height: fixed(2) } }),
      close(),
      close(),
    ];

    renderer.render(ops, { x: 0, y: 0, down: false });
    renderer.beginPointerPress();
    renderer.render(ops, { x: 0, y: 0, down: true });
    renderer.render(ops, { x: 0, y: 0, down: false });

    renderer.handleInput(mouseMoveAt(0, 0));
    renderer.handleInput(mouseDownAt(0, 0));
    renderer.handleInput(mouseUpAt(0, 0));
    renderer.handleInput(wheelDownAt(0, 0));

    expect(received).toEqual(["click", "move:0,0", "down:0", "up:0", "wheel:down"]);
  });
});
