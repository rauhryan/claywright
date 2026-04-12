/** @jsxImportSource @tui/solid-bindings */
import {
  createMemo,
  createSignal,
  createTranscriptVirtualItem,
  fixed,
  grow,
  runApp,
  type TranscriptVirtualItemKind,
  VirtualViewport,
} from "@tui/solid-bindings";

type Item = {
  key: string;
  sequence: number;
  speaker: string;
  kind: TranscriptVirtualItemKind;
  timestamp: string;
  version: number;
  text: string;
};

function itemKind(sequence: number): TranscriptVirtualItemKind {
  if (sequence % 5 === 0) return "system";
  return sequence % 2 === 0 ? "assistant" : "user";
}

function itemSpeaker(kind: TranscriptVirtualItemKind): string {
  switch (kind) {
    case "assistant":
      return "assistant";
    case "system":
      return "system";
    case "thinking":
      return "thinking";
    case "user":
    default:
      return "user";
  }
}

function itemTimestamp(sequence: number): string {
  const minute = 40 + (sequence % 20);
  return `09:${String(minute).padStart(2, "0")}`;
}

function itemText(sequence: number, version: number): string {
  if (version === 1) {
    return `Row ${sequence} streamed into the transcript viewport through prepared text measurement so wrapped rows and follow behavior stay aligned.`;
  }
  return `Row ${sequence} tail rewrite ${version} keeps the same key while the transcript settles, proving versioned prepared text items can update in place near the tail.`;
}

function buildItem(sequence: number, version: number = 1): Item {
  const kind = itemKind(sequence);
  return {
    key: `row-${sequence}`,
    sequence,
    speaker: itemSpeaker(kind),
    kind,
    timestamp: itemTimestamp(sequence),
    version,
    text: itemText(sequence, version),
  };
}

const [items, setItems] = createSignal<Item[]>(Array.from({ length: 30 }, (_, index) => buildItem(index + 1)));
const [status, setStatus] = createSignal("booting");
const [lastEvent, setLastEvent] = createSignal("none");

let next = items().length + 1;
let appendTurn = true;
setInterval(() => {
  setItems((current) => {
    if (appendTurn) {
      appendTurn = false;
      return [...current, buildItem(next++)];
    }

    appendTurn = true;
    const tail = current[current.length - 1];
    if (!tail) return current;
    const rewritten = buildItem(tail.sequence, tail.version + 1);
    return [...current.slice(0, -1), rewritten];
  });
}, 750);

const viewportItems = createMemo(() => items().map((item) => createTranscriptVirtualItem({
  key: item.key,
  version: item.version,
  speaker: item.speaker,
  kind: item.kind,
  timestamp: item.timestamp,
  text: item.text,
})));
const tail = createMemo(() => items()[items().length - 1]);

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Auto-Follow Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{status()} event={lastEvent()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      height={fixed(8)}
      bg={0xff101010}
      items={viewportItems()}
      onStateChange={(state) => {
        const last = tail();
        setStatus(
          `items=${items().length} scroll=${state.scrollTop} follow=${state.autoFollow ? "yes" : "no"} end=${state.atEnd ? "yes" : "no"} tail=${last ? `${last.key}@v${last.version}` : "none"}`,
        );
      }}
      onWheel={(event) => setLastEvent(`wheel:${event.direction}@${event.x},${event.y}`)}
    />
    <box width={grow()} height={fixed(1)}>
      <text>Wheel up to break follow. End to restore.</text>
    </box>
  </box>
));
