/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, rgba, runApp, VirtualViewport } from "@tui/solid-bindings";

const [boxStatus, setBoxStatus] = createSignal("idle");
const [viewportStatus, setViewportStatus] = createSignal("idle");

runApp(() => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Virtual Viewport Routing Demo</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Box: {boxStatus()}</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Viewport: {viewportStatus()}</text>
    </box>

    <box
      bg={rgba(40, 52, 72)}
      focusable={true}
      height={fixed(3)}
      id="box-target"
      onClick={() => {
        if (process.env.DEBUG_POINTER_ROUTING === "1") console.error("box-click");
        setBoxStatus("click");
      }}
      onWheel={(event) => {
        if (process.env.DEBUG_POINTER_ROUTING === "1")
          console.error("box-wheel", event.direction, event.x, event.y);
        setBoxStatus(`wheel:${event.direction}@${event.x},${event.y}`);
      }}
      width={fixed(20)}
    >
      <text color={rgba(255, 255, 255)}>Target box</text>
    </box>

    <VirtualViewport
      id="viewport"
      bg={rgba(72, 40, 52)}
      focusable={true}
      height={fixed(3)}
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
      onClick={() => {
        if (process.env.DEBUG_POINTER_ROUTING === "1") console.error("viewport-click");
        setViewportStatus("click");
      }}
      onWheel={(event) => {
        if (process.env.DEBUG_POINTER_ROUTING === "1")
          console.error("viewport-wheel", event.direction, event.x, event.y);
        setViewportStatus(`wheel:${event.direction}@${event.x},${event.y}`);
      }}
    />
  </box>
));
