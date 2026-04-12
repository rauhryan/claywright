import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Renderer, Renderable } from "../src/index.js";

class TestRenderable extends Renderable {}

describe("Renderer", () => {
  let renderer: Renderer;

  beforeEach(async () => {
    renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();
  });

  afterEach(() => {
    renderer.destroy();
  });

  test("initializes with dimensions", () => {
    expect(renderer.width).toBe(80);
    expect(renderer.height).toBe(24);
  });

  test("resize() updates dimensions", async () => {
    await renderer.resize(100, 30);

    expect(renderer.width).toBe(100);
    expect(renderer.height).toBe(30);
  });

  test("setRoot() builds ID map", () => {
    const root = new TestRenderable({ id: "root" });
    const child = new TestRenderable({ id: "child" });
    root.add(child);

    renderer.setRoot(root);

    expect(renderer.findRenderable("root")).toBe(root);
    expect(renderer.findRenderable("child")).toBe(child);
  });

  test("focusRenderable() sets focusedRenderable", () => {
    const box = new TestRenderable({ id: "box", focusable: true });
    renderer.setRoot(box);

    renderer.focusRenderable(box);

    expect(renderer.focusedRenderable).toBe(box);
    expect(box.focused).toBe(true);
  });

  test("focusRenderable() blurs previous focused element", () => {
    const box1 = new TestRenderable({ id: "box1", focusable: true });
    const box2 = new TestRenderable({ id: "box2", focusable: true });
    renderer.setRoot(box1);
    renderer.setRoot(box2);

    renderer.focusRenderable(box1);
    renderer.focusRenderable(box2);

    expect(box1.focused).toBe(false);
    expect(box2.focused).toBe(true);
  });

  test("blurRenderable() clears focus", () => {
    const box = new TestRenderable({ id: "box", focusable: true });
    renderer.setRoot(box);

    renderer.focusRenderable(box);
    renderer.blurRenderable(box);

    expect(renderer.focusedRenderable).toBe(null);
    expect(box.focused).toBe(false);
  });

  test("render() returns output", async () => {
    const { close, grow, open, text } = await import("clayterm");
    const ops = [
      open("root", { layout: { width: grow(), height: grow() } }),
      text("Hello World", {}),
      close(),
    ];

    const output = renderer.render(ops);

    // Output is Uint8Array, convert to string
    const outputStr = typeof output === "string" ? output : new TextDecoder().decode(output);
    expect(outputStr).toContain("Hello World");
  });
});

describe("Renderer focus management", () => {
  let renderer: Renderer;

  beforeEach(async () => {
    renderer = new Renderer({ width: 80, height: 24 });
    await renderer.init();
  });

  afterEach(() => {
    renderer.destroy();
  });

  test("findRenderable() returns undefined for unknown id", () => {
    const root = new TestRenderable({ id: "root" });
    renderer.setRoot(root);

    expect(renderer.findRenderable("nonexistent")).toBeUndefined();
  });

  test("setRoot() replaces previous root", () => {
    const root1 = new TestRenderable({ id: "root1" });
    const root2 = new TestRenderable({ id: "root2" });

    renderer.setRoot(root1);
    renderer.setRoot(root2);

    expect(renderer.findRenderable("root1")).toBeUndefined();
    expect(renderer.findRenderable("root2")).toBe(root2);
  });
});
