/** @jsxImportSource @tui/solid-bindings */
import {
  createPreparedTextVirtualItem,
  createSignal,
  createTranscriptVirtualItem,
  fixed,
  grow,
  runApp,
  VirtualViewport,
} from "@tui/solid-bindings";

const [status, setStatus] = createSignal("booting");

const items = [
  createTranscriptVirtualItem({
    key: "t-1",
    speaker: "user",
    timestamp: "09:41",
    kind: "user",
    text: "Prepared text item one wraps through the transcript helper so viewport measurement and row rendering stay aligned.",
  }),
  createTranscriptVirtualItem({
    key: "t-2",
    speaker: "assistant",
    timestamp: "09:42",
    kind: "assistant",
    renderMode: "ansi",
    prepare: { ansi: "skip-csi-osc", whiteSpace: "pre-wrap" },
    text: "ANSI demo: \x1b[36mSELECT\x1b[0m * FROM widgets WHERE status = \x1b[32m'ready'\x1b[0m; wrapped rows keep their visible width while spans stay color-aware.",
  }),
  createTranscriptVirtualItem({
    key: "t-3",
    speaker: "assistant",
    timestamp: "09:43",
    kind: "thinking",
    collapsed: true,
    collapsedSummary: "Thinking block collapsed. A richer consumer can expand it later.",
    text: "Prepared transcript helpers can also represent collapsible thinking blocks while keeping measurement in the same prepared-text pipeline.",
  }),
  createPreparedTextVirtualItem({
    key: "p-4",
    text: "Prepared text item four still uses the lower-level helper directly and styles continuation rows differently to prove the row hooks are live.",
    rowColor: (row) => row.continued ? 0xff9ecbff : 0xffedf3ff,
  }),
];

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Prepared Text Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{status()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      height={fixed(7)}
      initialAutoFollow={false}
      bg={0xff101010}
      items={items}
      onStateChange={(state) => {
        setStatus(`content=${state.contentHeight} items=${items.length} window=${state.windowStartIndex}-${state.windowEndIndex}`);
      }}
    />
  </box>
));
