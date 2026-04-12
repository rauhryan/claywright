/** @jsxImportSource @tui/solid-bindings */
import {
  createPreparedTextVirtualItem,
  createSignal,
  fixed,
  grow,
  runApp,
  VirtualViewport,
} from "@tui/solid-bindings";

const [status, setStatus] = createSignal("booting");

const items = Array.from({ length: 40 }, (_, index) => createPreparedTextVirtualItem({
  key: `row-${index + 1}`,
  text: `Geometry Row ${index + 1}`,
  estimatedElementsPerRow: 1,
  estimatedMeasuredWords: 1,
}));

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Geometry Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{status()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      width={grow()}
      height={grow()}
      initialAutoFollow={false}
      bg={0xff101010}
      items={items}
      onStateChange={(state) => {
        setStatus(
          `viewport=${state.viewportHeight} content=${state.contentHeight} window=${state.windowStartIndex}-${state.windowEndIndex}`,
        );
      }}
    />
    <box width={grow()} height={fixed(1)}>
      <text>Viewport height should reflect parent-constrained geometry.</text>
    </box>
  </box>
));
