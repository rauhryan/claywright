/** @jsxImportSource @tui/solid-bindings */
import { render, grow, fixed, rgba } from "@tui/solid-bindings"

render(() => (
  <box width={grow()} height={grow()} bg={rgba(10, 14, 22)}>
    <box 
      width={fixed(30)} 
      height={fixed(5)} 
      padding={{ left: 2, top: 2 }}
      bg={rgba(100, 149, 237)}
      focusable={true}
    >
      <text color={rgba(255, 255, 255)}>Click to focus</text>
    </box>
  </box>
))
