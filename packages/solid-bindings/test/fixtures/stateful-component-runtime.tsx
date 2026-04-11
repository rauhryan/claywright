/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, rgba, runApp, VirtualViewport } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("idle");

runApp(({ pointer }) => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Stateful Runtime Demo</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>
        Pointer: ({pointer.x}, {pointer.y}) {pointer.down ? "DOWN" : "UP"}
      </text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Status: {status()}</text>
    </box>
    <box
      id="sibling"
      bg={rgba(40, 52, 72)}
      height={fixed(2)}
      width={fixed(20)}
      onClick={() => setStatus("sibling-click")}
    >
      <text color={rgba(255, 255, 255)}>Sibling target</text>
    </box>
    <VirtualViewport
      id="viewport"
      bg={rgba(72, 40, 52)}
      height={fixed(3)}
      initialAutoFollow={false}
      items={Array.from({ length: 8 }, (_, index) => ({
        key: `row-${index + 1}`,
        version: 1,
        measure: () => ({ height: 1, estimatedElements: 1, estimatedMeasuredWords: 1 }),
        render: () => (
          <box height={fixed(1)} width={grow()}>
            <text color={rgba(255, 255, 255)}>Row {index + 1}</text>
          </box>
        ),
      }))}
      onWheel={(event) => setStatus(`viewport-wheel:${event.direction}@${event.x},${event.y}`)}
    />
  </box>
));
