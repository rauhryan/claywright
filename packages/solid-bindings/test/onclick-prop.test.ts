import { describe, expect, test } from "bun:test";
import { RootNode, render, createElement } from "../src/jsx-runtime";
import { createRenderableTree } from "../src/renderable-tree";

describe("onClick prop", () => {
  test("onClick prop is set on OpNode", () => {
    let clicked = false;
    const root = new RootNode();

    render(() => {
      const box = createElement("box");
      box.props.focusable = true;
      box.props.onClick = () => {
        clicked = true;
      };
      return box;
    }, root);

    const child = root.children[0];
    expect(child).toBeDefined();
    expect(child?.props.onClick).toBeDefined();
    expect(typeof child?.props.onClick).toBe("function");

    child?.props.onClick();
    expect(clicked).toBe(true);
  });

  test("onClick prop is proxied to Renderable", () => {
    let clicked = false;
    const root = new RootNode();

    render(() => {
      const box = createElement("box");
      box.props.focusable = true;
      box.props.onClick = () => {
        clicked = true;
      };
      return box;
    }, root);

    const child = root.children[0];
    expect(child).toBeDefined();

    const renderable = createRenderableTree(child!);
    expect(renderable).toBeDefined();
    expect(renderable?.onClick).toBeDefined();
    expect(typeof renderable?.onClick).toBe("function");

    renderable?.onClick?.({} as any);
    expect(clicked).toBe(true);
  });
});
