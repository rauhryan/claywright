import { describe, expect, test } from "bun:test";
import {
  layoutText,
  materializeTextRow,
  measureCellWidth,
  measureWrappedHeight,
  nextTextRow,
  prepareText,
  walkTextRows,
  wrapText,
} from "clayterm";
import { render } from "../src/jsx-runtime";
import { ElementOpNode, TextOpNode, type OpNode } from "../src/opnode";
import {
  createPreparedTextVirtualItem,
  createTranscriptVirtualItem,
} from "../src/virtual-scroll/text-items";

const textApi = {
  measureCellWidth,
  wrapText,
  measureWrappedHeight,
  prepareText,
  layoutText,
  walkTextRows,
  nextTextRow,
  materializeTextRow,
};

function collectTextElements(node: OpNode): Array<{ text: string; color?: number }> {
  const elements: Array<{ text: string; color?: number }> = [];

  function visit(current: OpNode) {
    if (current instanceof ElementOpNode && current.type === "text") {
      elements.push({
        text: current.children
          .filter((child): child is TextOpNode => child instanceof TextOpNode)
          .map((child) => child.value)
          .join(""),
        color: current.props.color as number | undefined,
      });
    }

    for (const child of current.children) {
      visit(child);
    }
  }

  visit(node);
  return elements;
}

function collectBoxNodes(node: OpNode): ElementOpNode[] {
  const boxes: ElementOpNode[] = [];

  function visit(current: OpNode) {
    if (current instanceof ElementOpNode && current.type === "box") {
      boxes.push(current);
    }
    for (const child of current.children) {
      visit(child);
    }
  }

  visit(node);
  return boxes;
}

describe("prepared text virtual item", () => {
  test("measures using the clayterm prepare/layout core", () => {
    const text = "Prepared text virtual items should wrap consistently with clayterm row counts.";
    const item = createPreparedTextVirtualItem({ key: "message-1", text });
    const measured = item.measure(12, textApi);
    expect(measured.height).toBe(layoutText(prepareText(text), { columns: 12 }).rowCount);
    expect(measured.height).toBeGreaterThan(1);
  });

  test("ANSI render mode preserves styled runs while measuring stripped text", () => {
    const item = createPreparedTextVirtualItem({
      key: "message-ansi",
      text: "\x1b[31mred\x1b[0m plain \x1b[38;5;45mcyan\x1b[0m",
      prepare: { ansi: "skip-csi-osc", whiteSpace: "pre-wrap" },
      renderMode: "ansi",
    });

    const measured = item.measure(40, textApi);
    expect(measured.height).toBe(1);

    const root = new ElementOpNode("root", "root");
    const dispose = render(() => item.render(), root);
    const textElements = collectTextElements(root);

    expect(textElements.some((entry) => entry.text === "red" && entry.color === 0xffcd3131)).toBe(true);
    expect(textElements.some((entry) => entry.text === " plain " && entry.color === undefined)).toBe(true);
    expect(textElements.some((entry) => entry.text === "cyan" && entry.color === 0xff00d7ff)).toBe(true);

    dispose();
  });

  test("row styling hooks can vary color and background by wrapped row", () => {
    const item = createPreparedTextVirtualItem({
      key: "message-rows",
      text: "alpha beta gamma delta",
      rowColor: (row) => row.continued ? 0xffa6e3a1 : 0xffedf3ff,
      rowBg: (row) => row.index === 1 ? 0xff202030 : undefined,
    });

    item.measure(8, textApi);
    const root = new ElementOpNode("root", "root");
    const dispose = render(() => item.render(), root);

    const textElements = collectTextElements(root);
    const rowBoxes = collectBoxNodes(root).slice(1);

    expect(textElements[0]?.color).toBe(0xffedf3ff);
    expect(textElements[1]?.color).toBe(0xffa6e3a1);
    expect(rowBoxes[1]?.props.bg).toBe(0xff202030);

    dispose();
  });

  test("transcript virtual items shrink when collapsed", () => {
    const expanded = createTranscriptVirtualItem({
      key: "thinking-expanded",
      speaker: "assistant",
      kind: "thinking",
      text: "A thinking block should occupy multiple wrapped rows when expanded in a narrow viewport.",
    });
    const collapsed = createTranscriptVirtualItem({
      key: "thinking-collapsed",
      speaker: "assistant",
      kind: "thinking",
      collapsed: true,
      collapsedSummary: "Thinking block collapsed.",
      text: "A thinking block should occupy multiple wrapped rows when expanded in a narrow viewport.",
    });

    expect(expanded.measure(12, textApi).height).toBeGreaterThan(collapsed.measure(12, textApi).height);
  });

  test("transcript virtual items can render a header badge", () => {
    const item = createTranscriptVirtualItem({
      key: "thinking-badge",
      speaker: "assistant",
      kind: "thinking",
      badgeText: "collapsed",
      badgeBg: 0xff54306c,
      badgeColor: 0xfffff4d6,
      text: "thinking body",
    });

    item.measure(20, textApi);
    const root = new ElementOpNode("root", "root");
    const dispose = render(() => item.render(), root);
    const textElements = collectTextElements(root);

    expect(textElements.some((entry) => entry.text === "collapsed" && entry.color === 0xfffff4d6)).toBe(true);

    dispose();
  });

  test("render returns a renderable element after measure", () => {
    const item = createPreparedTextVirtualItem({ key: "message-2", text: "hello wrapped world" });
    item.measure(5, textApi);
    expect(item.render()).toBeTruthy();
  });
});
