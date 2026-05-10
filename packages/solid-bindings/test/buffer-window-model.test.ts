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
} from "@tui/text-measure";
import { createPreparedTextBuffer, createTranscriptBuffer, type BufferWindowModel } from "../src";

const measureApi = {
  measureCellWidth,
  wrapText,
  measureWrappedHeight,
  prepareText,
  layoutText,
  walkTextRows,
  nextTextRow,
  materializeTextRow,
};

describe("buffer-window models", () => {
  test("prepared-text buffers resolve fresh virtual items per window while reusing block identity", () => {
    const buffer = createPreparedTextBuffer({
      id: "notes",
      blocks: [
        {
          key: "intro",
          text: "Prepared text blocks should resolve per-window items.",
        },
      ],
    });

    const leftWindow: BufferWindowModel = {
      id: "left",
      bufferId: "notes",
      mode: "split",
    };
    const rightWindow: BufferWindowModel = {
      id: "right",
      bufferId: "notes",
      mode: "docked",
    };

    const leftContent = buffer.resolveContent(leftWindow);
    const rightContent = buffer.resolveContent(rightWindow);
    expect(leftContent.kind).toBe("items");
    expect(rightContent.kind).toBe("items");
    if (leftContent.kind !== "items" || rightContent.kind !== "items") {
      throw new Error("Expected prepared-text buffer to resolve item content.");
    }

    const leftItem = leftContent.items[0]!;
    const rightItem = rightContent.items[0]!;

    expect(leftItem).not.toBe(rightItem);
    expect(leftItem.key).toBe("intro");
    expect(rightItem.key).toBe("intro");
    expect(leftItem.measure(24, measureApi).height).toBe(rightItem.measure(24, measureApi).height);
  });

  test("transcript buffers derive collapse from window-local view state", () => {
    const buffer = createTranscriptBuffer({
      id: "conversation",
      entries: [
        {
          key: "thinking-1",
          speaker: "assistant",
          kind: "thinking",
          text: "This is a much longer reasoning block that should wrap to multiple rows when expanded.",
          collapsedSummary: "Reasoning hidden",
        },
      ],
    });

    const expandedWindow: BufferWindowModel = {
      id: "main",
      bufferId: "conversation",
      mode: "docked",
    };
    const collapsedWindow: BufferWindowModel = {
      id: "peek",
      bufferId: "conversation",
      mode: "floating",
      viewState: {
        collapsedKeys: {
          "thinking-1": true,
        },
      },
    };

    const expandedContent = buffer.resolveContent(expandedWindow);
    const collapsedContent = buffer.resolveContent(collapsedWindow);
    expect(expandedContent.kind).toBe("items");
    expect(collapsedContent.kind).toBe("items");
    if (expandedContent.kind !== "items" || collapsedContent.kind !== "items") {
      throw new Error("Expected transcript buffer to resolve item content.");
    }

    const expandedItem = expandedContent.items[0]!;
    const collapsedItem = collapsedContent.items[0]!;
    const expandedHeight = expandedItem.measure(22, measureApi).height;
    const collapsedHeight = collapsedItem.measure(22, measureApi).height;

    expect(expandedItem.version).not.toBe(collapsedItem.version);
    expect(collapsedHeight).toBeLessThan(expandedHeight);
  });
});
