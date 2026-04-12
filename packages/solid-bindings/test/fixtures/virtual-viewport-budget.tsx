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

const items = Array.from({ length: 6 }, (_, index) => createPreparedTextVirtualItem({
  key: `row-${index + 1}`,
  text: `Budget Row ${index + 1}`,
  estimatedElementsPerRow: 3,
  estimatedMeasuredWords: 2,
}));

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb">
    <box width={grow()} height={fixed(1)}>
      <text>Virtual Viewport Budget Demo</text>
    </box>
    <box width={grow()} height={fixed(1)}>
      <text>{status()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      height={fixed(4)}
      initialAutoFollow={false}
      budget={{ maxEstimatedElements: 1 }}
      bg={0xff101010}
      items={items}
      onStateChange={(state) => {
        setStatus(
          `scroll=${state.scrollTop} budget=${state.budgetExceeded ? "yes" : "no"} window=${state.windowStartIndex}-${state.windowEndIndex}`,
        );
      }}
    />
    <box width={grow()} height={fixed(1)}>
      <text>Visible content must remain even when budget is exceeded.</text>
    </box>
  </box>
));
