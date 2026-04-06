import { describe, expect, test } from "bun:test";
import { InputRenderable } from "../src/InputRenderable.js";
import { Renderable } from "../src/Renderable.js";
import { Renderer } from "../src/Renderer.js";

class BoxRenderable extends Renderable {}

describe("input focus routing", () => {
  test("clicking a non-focusable parent can focus a child input", async () => {
    const renderer = new Renderer({ height: 24, width: 80 });
    await renderer.init();

    const root = new BoxRenderable({ id: "root" });
    const box = new BoxRenderable({ id: "box" });
    const input = new InputRenderable({ id: "input" });

    root.add(box);
    box.add(input);
    renderer.setRoot(root);

    (renderer as any).handlePointerEvent({ id: "box", type: "pointerclick" });

    expect(renderer.focusedRenderable).toBe(input);
    expect(input.focused).toBe(true);
  });
});
