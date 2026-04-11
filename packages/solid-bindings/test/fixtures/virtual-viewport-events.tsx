/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, rgba, runApp, VirtualViewport } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("idle");

runApp(() => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Viewport Events Demo</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Status: {status()}</text>
    </box>
    <VirtualViewport
      id="viewport"
      bg={rgba(40, 52, 72)}
      height={fixed(4)}
      initialAutoFollow={false}
      items={Array.from({ length: 6 }, (_, index) => ({
        key: `row-${index + 1}`,
        version: 1,
        measure: () => ({ height: 1, estimatedElements: 1, estimatedMeasuredWords: 1 }),
        render: () => (
          <box height={fixed(1)} width={grow()}>
            <text color={rgba(255, 255, 255)}>Row {index + 1}</text>
          </box>
        ),
      }))}
      onMouseDown={() => setStatus("mousedown")}
      onClick={() => setStatus("click")}
      onWheel={(event) => setStatus(`wheel:${event.direction}@${event.x},${event.y}`)}
    />
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(180, 180, 180)}>Outside area</text>
    </box>
  </box>
));
