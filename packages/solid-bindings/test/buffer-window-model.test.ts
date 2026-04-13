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

    const leftItem = buffer.resolveContent(leftWindow).items[0];
    const rightItem = buffer.resolveContent(rightWindow).items[0];

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

    const expandedItem = buffer.resolveContent(expandedWindow).items[0];
    const collapsedItem = buffer.resolveContent(collapsedWindow).items[0];
    const expandedHeight = expandedItem.measure(22, measureApi).height;
    const collapsedHeight = collapsedItem.measure(22, measureApi).height;

    expect(expandedItem.version).not.toBe(collapsedItem.version);
    expect(collapsedHeight).toBeLessThan(expandedHeight);
  });
});
