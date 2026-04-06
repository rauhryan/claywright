/** @jsxImportSource @tui/solid-bindings */
import { render, grow, fixed, rgba } from "@tui/solid-bindings";

render(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(20, 24, 32)}>
    <box
      width={fixed(20)}
      height={fixed(5)}
      padding={{ left: 2, top: 2 }}
      bg={rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
    >
      <text color={rgba(255, 255, 255)}>Header</text>
    </box>
    <box width={grow()} height={grow()}>
      <text>Hello World</text>
    </box>
  </box>
));
