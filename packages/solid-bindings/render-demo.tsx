/** @jsxImportSource @tui/solid-bindings */
import { render, fixed, grow, rgba } from "@tui/solid-bindings";

await render(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box
      width={fixed(30)}
      height={fixed(5)}
      padding={{ left: 2, top: 2 }}
      bg={rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
    >
      <text color={rgba(255, 255, 255)}>Hello from JSX OpNode</text>
    </box>
    <box width={grow()} height={grow()} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 200, 200)}>This uses the main JSX runtime and OpNode tree.</text>
    </box>
  </box>
));
