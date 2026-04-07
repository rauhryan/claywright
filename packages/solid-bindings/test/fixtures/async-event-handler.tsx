/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("idle");

runApp(() => (
  <box width={grow()} height={grow()} padding={{ left: 1, top: 1 }} bg={rgba(10, 14, 22)}>
    <box
      width={fixed(32)}
      height={fixed(5)}
      padding={{ left: 1, top: 1 }}
      bg={rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
      focusable={true}
      onClick={async () => {
        setStatus("pending");
        await new Promise((resolve) => setTimeout(resolve, 50));
        setStatus("done");
      }}
    >
      <text color={rgba(255, 255, 255)}>Event status: {status()}</text>
    </box>
  </box>
));
