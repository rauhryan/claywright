import { describe, expect, test } from "bun:test";
import { close, open } from "clayterm";
import { RootNode, ElementNode, TextNode, jsx, renderToString } from "../src/jsx-runtime";

describe("opnode jsx runtime", () => {
  test("creates element tree with stable ids", () => {
    const box = jsx("box", {});
    const text = jsx("text", {});
    const leaf = new TextNode("text-node-test", "hello");

    box.add(text);
    text.add(leaf);

    expect(typeof box.id).toBe("string");
    expect(typeof text.id).toBe("string");
    expect(box.id).not.toBe(text.id);
    expect(box.children[0]).toBe(text);
  });

  test("jsx builds opnode tree", () => {
    const node = jsx("box", { children: jsx("text", { children: "Hello" }) });

    expect(node.type).toBe("box");
    expect(node.children).toHaveLength(1);
    expect(node.children[0]?.type).toBe("text");
    expect(renderToString(node)).toBe("<box><text>Hello</text></box>");
  });

  test("element ops serialize nested tree", () => {
    const root = new RootNode();
    const node = jsx("box", { children: jsx("text", { children: "Hello" }) });
    root.add(node);

    const ops = [open("root", {}), ...root.children.flatMap((child) => child.toOps()), close()];

    expect(ops[0]).toHaveProperty("name", "root");
    expect(ops[1]).toHaveProperty("name", node.id);
    expect(ops[2]).toHaveProperty("content", "Hello");
    expect(ops[3]).toHaveProperty("id");
  });
});
