import { describe, expect, test } from "bun:test";
import { InputRenderable, Renderable, Renderer, KeyboardEvent } from "../src/index.js";

class TestRenderable extends Renderable {
  constructor(id: string, opts?: { focusable?: boolean }) {
    super({ id, focusable: opts?.focusable });
  }
}

describe("keyboard event routing", () => {
  test("keydown is dispatched to the focused renderable", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const root = new TestRenderable("root");
    const input = new InputRenderable({ id: "input" });
    root.add(input);
    renderer.setRoot(root);
    renderer.focusRenderable(input);

    renderer.handleInput(new TextEncoder().encode("a"));

    expect(input.value).toBe("a");
    renderer.destroy();
  });

  test("keydown events bubble through the renderable tree", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const root = new TestRenderable("root");
    const outer = new TestRenderable("outer");
    const inner = new TestRenderable("inner", { focusable: true });

    let bubbled = false;
    inner.onKeyDown = () => {};
    outer.onKeyDown = () => {
      bubbled = true;
    };

    root.add(outer);
    outer.add(inner);
    renderer.setRoot(root);
    renderer.focusRenderable(inner);

    renderer.handleInput(new TextEncoder().encode("x"));

    expect(bubbled).toBe(true);
    renderer.destroy();
  });

  test("stopPropagation prevents event from bubbling further", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const root = new TestRenderable("root");
    const outer = new TestRenderable("outer");
    const inner = new TestRenderable("inner", { focusable: true });

    let outerReceived = false;
    inner.onKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation();
    };
    outer.onKeyDown = () => {
      outerReceived = true;
    };

    root.add(outer);
    outer.add(inner);
    renderer.setRoot(root);
    renderer.focusRenderable(inner);

    renderer.handleInput(new TextEncoder().encode("x"));

    expect(outerReceived).toBe(false);
    renderer.destroy();
  });

  test("keydown is not dispatched when no element is focused", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const root = new TestRenderable("root");
    const input = new InputRenderable({ id: "input" });
    root.add(input);
    renderer.setRoot(root);

    expect(renderer.focusedRenderable).toBe(null);

    renderer.handleInput(new TextEncoder().encode("a"));

    expect(input.value).toBe("");
    renderer.destroy();
  });

  test("preventDefault on keydown prevents tab navigation", async () => {
    const renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();

    const root = new TestRenderable("root");
    const first = new InputRenderable({ id: "first" });
    const second = new InputRenderable({ id: "second" });
    root.add(first);
    root.add(second);
    renderer.setRoot(root);
    renderer.focusRenderable(first);

    first.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
      }
    };

    renderer.handleInput(new TextEncoder().encode("\t"));

    expect(renderer.focusedRenderable).toBe(first);
    renderer.destroy();
  });
});
