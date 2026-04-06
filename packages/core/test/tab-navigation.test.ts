import { describe, expect, test } from "bun:test";
import { InputRenderable } from "../src/InputRenderable.js";
import { Renderable } from "../src/Renderable.js";
import { Renderer } from "../src/Renderer.js";

class BoxRenderable extends Renderable {}

describe("tab navigation", () => {
  test("tab focuses the first focusable renderable when nothing is focused", async () => {
    const renderer = new Renderer({ height: 24, width: 80 });
    await renderer.init();

    const root = new BoxRenderable({ id: "root" });
    const first = new InputRenderable({ id: "first" });
    const second = new InputRenderable({ id: "second" });
    root.add(first);
    root.add(second);
    renderer.setRoot(root);

    renderer.handleInput(new TextEncoder().encode("\t"));

    expect(renderer.focusedRenderable).toBe(first);
    renderer.destroy();
  });

  test("tab advances focus in tree order and wraps around", async () => {
    const renderer = new Renderer({ height: 24, width: 80 });
    await renderer.init();

    const root = new BoxRenderable({ id: "root" });
    const first = new InputRenderable({ id: "first" });
    const second = new InputRenderable({ id: "second" });
    const third = new InputRenderable({ id: "third" });
    root.add(first);
    root.add(second);
    root.add(third);
    renderer.setRoot(root);

    renderer.focusRenderable(first);
    renderer.handleInput(new TextEncoder().encode("\t"));
    expect(renderer.focusedRenderable).toBe(second);

    renderer.handleInput(new TextEncoder().encode("\t"));
    expect(renderer.focusedRenderable).toBe(third);

    renderer.handleInput(new TextEncoder().encode("\t"));
    expect(renderer.focusedRenderable).toBe(first);

    renderer.destroy();
  });

  test("tab with shift modifier moves focus backward", async () => {
    const renderer = new Renderer({ height: 24, width: 80 });
    await renderer.init();

    const root = new BoxRenderable({ id: "root" });
    const first = new InputRenderable({ id: "first" });
    const second = new InputRenderable({ id: "second" });
    root.add(first);
    root.add(second);
    renderer.setRoot(root);
    renderer.focusRenderable(first);

    renderer.handleInput(new TextEncoder().encode("\x1b[9;2u"));

    expect(renderer.focusedRenderable).toBe(second);
    renderer.destroy();
  });

  test("preventDefault on tab keeps focus in place", async () => {
    const renderer = new Renderer({ height: 24, width: 80 });
    await renderer.init();

    const root = new BoxRenderable({ id: "root" });
    const first = new InputRenderable({
      id: "first",
      onFocus: () => {},
    });
    const second = new InputRenderable({ id: "second" });
    first.onKeyDown = (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
      }
    };

    root.add(first);
    root.add(second);
    renderer.setRoot(root);
    renderer.focusRenderable(first);

    renderer.handleInput(new TextEncoder().encode("\t"));

    expect(renderer.focusedRenderable).toBe(first);
    renderer.destroy();
  });
});
