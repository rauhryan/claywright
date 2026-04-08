import { createSignal } from "solid-js";
import {
  createElement,
  createTextNode,
  fixed,
  grow,
  insert,
  insertNode,
  rgba,
  runApp,
  setProp,
} from "@tui/solid-bindings";

const [count, setCount] = createSignal(0);

runApp(() => {
  const root = createElement("box");
  const box = createElement("box");
  const text = createElement("text");

  setProp(root, "width", grow());
  setProp(root, "height", grow());
  setProp(root, "bg", rgba(10, 14, 22));

  setProp(box, "width", fixed(30));
  setProp(box, "height", fixed(5));
  setProp(box, "padding", { left: 2, top: 2 });
  setProp(box, "bg", rgba(100, 149, 237));
  setProp(box, "border", { color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 });
  setProp(box, "focusable", true);
  setProp(box, "onClick", () => setCount((value) => value + 1));

  setProp(text, "color", rgba(255, 255, 255));

  insertNode(text, createTextNode("Count: "));
  insert(text, count, null);
  insertNode(box, text);
  insertNode(root, box);

  return root;
});
