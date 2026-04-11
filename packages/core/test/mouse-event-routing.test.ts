import { describe, expect, test } from "bun:test";
import { MouseEvent, Renderable, Renderer } from "../src/index.js";

class TestRenderable extends Renderable {}

const encoder = new TextEncoder();

function mouseDownAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<0;${x + 1};${y + 1}M`);
}

describe("mouse event routing", () => {
  test("mousedown events target the hovered renderable and bubble", async () => {
    const renderer = new Renderer({ width: 20, height: 6 });
    await renderer.init();

    const root = new TestRenderable({ id: "root" });
    const child = new TestRenderable({ id: "box" });
    root.add(child);

    const received: string[] = [];
    child.onMouseDown = (event: MouseEvent) => {
      received.push(`child:${event.type}:${event.button}`);
    };
    root.onMouseDown = (event: MouseEvent) => {
      received.push(`root:${event.type}:${event.button}`);
    };

    renderer.setRoot(root);
    renderer.hoveredRenderables = [root, child];
    renderer.handleInput(mouseDownAt(0, 0));

    expect(received).toEqual(["child:mousedown:0", "root:mousedown:0"]);
  });
});
