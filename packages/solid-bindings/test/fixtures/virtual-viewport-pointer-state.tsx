/** @jsxImportSource @tui/solid-bindings */
import { fixed, grow, rgba, runApp, VirtualViewport } from "@tui/solid-bindings";

runApp(({ pointer }) => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>
        Pointer: ({pointer.x}, {pointer.y}) {pointer.down ? "DOWN" : "UP"}
      </text>
    </box>
    <box id="box-target" bg={rgba(40, 52, 72)} width={fixed(20)} height={fixed(3)}>
      <text color={rgba(255, 255, 255)}>Target box</text>
    </box>
    <VirtualViewport
      id="viewport"
      bg={rgba(72, 40, 52)}
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
    />
  </box>
));
