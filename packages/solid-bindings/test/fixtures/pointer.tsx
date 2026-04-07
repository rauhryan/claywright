/** @jsxImportSource @tui/solid-bindings */
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

runApp(({ pointer }) => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} padding={{ left: 1, top: 1 }} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>
        Pointer: ({pointer.x}, {pointer.y}) {pointer.down ? "DOWN" : "UP"}
      </text>
    </box>
  </box>
));
