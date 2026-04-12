/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, runApp, VirtualViewport } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("booting");

const items = Array.from({ length: 10000 }, (_, index) => ({
  key: `row-${index + 1}`,
  version: 1,
  measure: () => ({ height: 1, estimatedElements: 1, estimatedMeasuredWords: 1 }),
  render: () => (
    <box width={grow()} height={fixed(1)}>
      <text>{`History Row ${index + 1}`}</text>
    </box>
  ),
}));

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Large History Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{status()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      height={fixed(8)}
      initialAutoFollow={false}
      bg={0xff101010}
      items={items}
      onStateChange={(state) => {
        setStatus(
          `scroll=${state.scrollTop} content=${state.contentHeight} window=${state.windowStartIndex}-${state.windowEndIndex}`,
        );
      }}
    />
    <box width={grow()} height={fixed(1)}>
      <text>Use wheel / PageDown to verify large-history responsiveness.</text>
    </box>
  </box>
));
