import { describe, expect, test } from "bun:test";
import { close, open, type Op } from "clayterm";
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

    expect(ops[0]).toHaveProperty("id", "root");
    expect(ops[0]).toHaveProperty("directive", 0x02);
    expect(ops[1]).toHaveProperty("id", node.id);
    expect(ops[1]).toHaveProperty("directive", 0x02);
    expect(ops[2]).toHaveProperty("content", "Hello");
    expect(ops[2]).toHaveProperty("directive", 0x03);
    expect(ops[3]).toHaveProperty("directive", 0x04);
  });

  test("element ops serialize boolean clip props", () => {
    const node = jsx("box", {
      id: "clipped",
      clip: { horizontal: true, vertical: true },
    });

    const [op] = node.toOps();

    expect(op).toHaveProperty("id", "clipped");
    expect(op).toHaveProperty("clip", { horizontal: true, vertical: true });
    expect(op).not.toHaveProperty("clip.x");
    expect(op).not.toHaveProperty("clip.y");
  });

  test("element ops inherit floating z-index for nested floating layers", () => {
    const node = jsx("box", {
      id: "floating-window",
      floating: { attachTo: "root", zIndex: 45 },
      children: jsx("box", {
        id: "floating-content",
        floating: {
          attachTo: "parent",
          attachPoints: { element: "left-top", parent: "left-top" },
        },
      }),
    });

    const content = (node.toOps() as Op[]).find((op) => "id" in op && op.id === "floating-content");

    expect(content).toHaveProperty("floating.zIndex", 45);
  });
});
