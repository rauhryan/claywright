/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("booting");

setTimeout(() => {
  setStatus("resolved");
}, 50);

runApp(() => (
  <box width={grow()} height={grow()} padding={{ left: 1, top: 1 }} bg={rgba(10, 14, 22)}>
    <box width={fixed(32)} height={fixed(3)}>
      <text color={rgba(255, 255, 255)}>Timeout status: {status()}</text>
    </box>
  </box>
));
