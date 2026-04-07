import { describe, expect, test } from "bun:test";
import { ElementOpNode, TextOpNode } from "../src/opnode";

describe("opnode invalidation", () => {
  test("notifies the root invalidation listener when a descendant becomes dirty", () => {
    const root = new ElementOpNode("root", "root");
    const parent = new ElementOpNode("box", "box-1");
    const text = new TextOpNode("text-1", "before");
    let invalidations = 0;

    root.setInvalidationListener(() => {
      invalidations += 1;
    });

    root.add(parent);
    parent.add(text);
    invalidations = 0;

    root.markClean();
    parent.markClean();
    text.markClean();

    text.replace("after");

    expect(text.isDirty).toBe(true);
    expect(parent.isDirty).toBe(true);
    expect(root.isDirty).toBe(true);
    expect(invalidations).toBe(1);
  });
});
