/** @jsxImportSource @tui/solid-bindings */
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

runApp(({ width, height, pointer }) => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box
      width={fixed(30)}
      height={fixed(5)}
      padding={{ left: 2, top: 2 }}
      bg={rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
    >
      <text color={rgba(255, 255, 255)}>Solid Bindings Demo</text>
    </box>
    <box width={grow()} height={grow()} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 200, 200)}>
        Terminal: {width}x{height}
      </text>
    </box>
    <box width={grow()} height={grow()} padding={{ left: 2 }}>
      <text color={rgba(200, 200, 200)}>
        Mouse: ({pointer.x}, {pointer.y}) {pointer.down ? "DOWN" : ""}
      </text>
    </box>
    <box width={grow()} height={fixed(3)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>Press Q or Ctrl+C to exit</text>
    </box>
  </box>
));
