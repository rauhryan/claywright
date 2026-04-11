import { describe, expect, test } from "bun:test";
import { Renderable, Renderer, WheelEvent } from "../src/index.js";

class TestRenderable extends Renderable {}

const encoder = new TextEncoder();

function wheelUpAt(x: number, y: number): Uint8Array {
  return encoder.encode(`\x1b[<64;${x + 1};${y + 1}M`);
}

describe("wheel event routing", () => {
  test("wheel events target the hovered renderable and bubble", async () => {
    const renderer = new Renderer({ width: 20, height: 6 });
    await renderer.init();

    const root = new TestRenderable({ id: "root" });
    const child = new TestRenderable({ id: "box" });
    root.add(child);

    const received: string[] = [];
    child.onWheel = (event: WheelEvent) => {
      received.push(`child:${event.direction}`);
    };
    root.onWheel = (event: WheelEvent) => {
      received.push(`root:${event.direction}`);
    };

    renderer.setRoot(root);
    renderer.hoveredRenderables = [root, child];
    renderer.handleInput(wheelUpAt(0, 0));

    expect(received).toEqual(["child:up", "root:up"]);
  });

  test("wheel events continue bubbling when the target prevents default", async () => {
    const renderer = new Renderer({ width: 20, height: 6 });
    await renderer.init();

    const root = new TestRenderable({ id: "root" });
    const child = new TestRenderable({ id: "box" });
    root.add(child);

    let bubbled = false;
    child.onWheel = (event: WheelEvent) => {
      event.preventDefault();
    };
    root.onWheel = () => {
      bubbled = true;
    };

    renderer.setRoot(root);
    renderer.hoveredRenderables = [root, child];
    renderer.handleInput(wheelUpAt(0, 0));

    expect(bubbled).toBe(true);
  });
});
