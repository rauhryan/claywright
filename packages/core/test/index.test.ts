import { describe, expect, test } from "bun:test";
import { KeyboardEvent, MouseEvent, Renderable } from "../src/index.js";

class TestRenderable extends Renderable {}

describe("Renderable", () => {
  test("creates with id", () => {
    const renderable = new TestRenderable({ id: "test" });
    expect(renderable.id).toBe("test");
  });

  test("auto-generates id if not provided", () => {
    const renderable = new TestRenderable();
    expect(renderable.id).toMatch(/^renderable_\d+$/);
  });

  test("focusable defaults to false", () => {
    const renderable = new TestRenderable();
    expect(renderable.focusable).toBe(false);
  });

  test("can set focusable via options", () => {
    const renderable = new TestRenderable({ focusable: true });
    expect(renderable.focusable).toBe(true);
  });

  test("focus() sets focused to true", () => {
    const renderable = new TestRenderable({ focusable: true });
    renderable.focus();
    expect(renderable.focused).toBe(true);
  });

  test("focus() does nothing if not focusable", () => {
    const renderable = new TestRenderable({ focusable: false });
    renderable.focus();
    expect(renderable.focused).toBe(false);
  });

  test("blur() sets focused to false", () => {
    const renderable = new TestRenderable({ focusable: true });
    renderable.focus();
    renderable.blur();
    expect(renderable.focused).toBe(false);
  });
});

describe("Renderable tree", () => {
  test("add() sets parent", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });

    parent.add(child);

    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
  });

  test("remove() clears parent", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });

    parent.add(child);
    parent.remove(child);

    expect(child.parent).toBe(null);
    expect(parent.children).not.toContain(child);
  });

  test("getRenderableById() finds nested children", () => {
    const root = new TestRenderable({ id: "root" });
    const child1 = new TestRenderable({ id: "child1" });
    const child2 = new TestRenderable({ id: "child2" });
    const grandchild = new TestRenderable({ id: "grandchild" });

    root.add(child1);
    root.add(child2);
    child1.add(grandchild);

    expect(root.getRenderableById("grandchild")).toBe(grandchild);
    expect(root.getRenderableById("nonexistent")).toBeUndefined();
  });

  test("getFocusableAncestor() walks up tree", () => {
    const root = new TestRenderable({ id: "root", focusable: true });
    const child = new TestRenderable({ id: "child" });
    const grandchild = new TestRenderable({ id: "grandchild" });

    root.add(child);
    child.add(grandchild);

    expect(grandchild.getFocusableAncestor()).toBe(root);
  });
});

describe("Event bubbling", () => {
  test("processEvent() bubbles to parent", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });
    parent.add(child);

    let parentGotEvent = false;
    parent.onClick = () => (parentGotEvent = true);

    const event = new MouseEvent("click", child, { x: 0, y: 0, button: 0 });
    child.processEvent(event);

    expect(parentGotEvent).toBe(true);
  });

  test("stopPropagation() stops bubbling", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });
    parent.add(child);

    let parentGotEvent = false;
    parent.onClick = () => (parentGotEvent = true);
    child.onClick = (e: MouseEvent) => e.stopPropagation();

    const event = new MouseEvent("click", child, { x: 0, y: 0, button: 0 });
    child.processEvent(event);

    expect(parentGotEvent).toBe(false);
  });
});

describe("Events", () => {
  test("MouseEvent has correct properties", () => {
    const target = new TestRenderable({ id: "target" });
    const event = new MouseEvent("click", target, {
      x: 10,
      y: 20,
      button: 0,
      modifiers: { shift: true, alt: false, ctrl: false },
    });

    expect(event.type).toBe("click");
    expect(event.target).toBe(target);
    expect(event.x).toBe(10);
    expect(event.y).toBe(20);
    expect(event.button).toBe(0);
    expect(event.modifiers.shift).toBe(true);
  });

  test("KeyboardEvent has correct properties", () => {
    const target = new TestRenderable({ id: "target" });
    const event = new KeyboardEvent("keydown", target, {
      key: "a",
      code: "KeyA",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    });

    expect(event.type).toBe("keydown");
    expect(event.key).toBe("a");
    expect(event.code).toBe("KeyA");
    expect(event.modifiers.ctrl).toBe(true);
  });

  test("preventDefault() sets flag", () => {
    const target = new TestRenderable({ id: "target" });
    const event = new MouseEvent("click", target, { x: 0, y: 0, button: 0 });

    expect(event.defaultPrevented).toBe(false);
    event.preventDefault();
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("Lifecycle", () => {
  test("destroy() removes from parent", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });
    parent.add(child);

    child.destroy();

    expect(child.isDestroyed).toBe(true);
    expect(parent.children).not.toContain(child);
  });

  test("destroy() destroys children recursively", () => {
    const parent = new TestRenderable({ id: "parent" });
    const child = new TestRenderable({ id: "child" });
    parent.add(child);

    parent.destroy();

    expect(parent.isDestroyed).toBe(true);
    expect(child.isDestroyed).toBe(true);
  });

  test("destroy() blurs if focused", () => {
    const renderable = new TestRenderable({ id: "test", focusable: true });
    renderable.focus();
    expect(renderable.focused).toBe(true);

    renderable.destroy();
    expect(renderable.focused).toBe(false);
  });
});
