import { describe, expect, test } from "bun:test";
import { createElement, insertNode, jsx, mergeProps, ref, spread, type ElementNode } from "../src";

describe("solid 2 renderer setup", () => {
  test("mergeProps combines spread sources for universal transform", () => {
    const merged = mergeProps({ id: "one", focusable: false }, { focusable: true });

    expect(merged.id).toBe("one");
    expect(merged.focusable).toBe(true);
  });

  test("ref applies function refs and ref arrays", () => {
    const node = createElement("box");
    const calls: string[] = [];

    ref(
      () => [
        (el: ElementNode) => calls.push(`${el.type}:${el.id}`),
        (el: ElementNode) => calls.push(`again:${el.type}`),
      ],
      node,
    );

    expect(calls).toEqual([`box:${node.id}`, "again:box"]);
  });

  test("jsx accepts function-returning children values", () => {
    const node = jsx("text", { children: () => "Hello 2.0" });

    expect(node).toBeDefined();
    expect((node as ElementNode).children[0]).toBeDefined();
    expect((node as ElementNode).children[0]?.value).toBe("Hello 2.0");
  });

  test("spread updates node props through universal helper", () => {
    const node = createElement("box");
    const child = createElement("text");
    insertNode(node, child);

    spread(node, { id: "custom-id", focusable: true, bg: 123, children: "ok" });

    expect(node.id).toBe("custom-id");
    expect(node.props.focusable).toBe(true);
    expect(node.props.bg).toBe(123);
    expect(child.parent).toBeNull();
    expect(node.children).toHaveLength(1);
    expect(node.children[0]?.value).toBe("ok");
  });
});
