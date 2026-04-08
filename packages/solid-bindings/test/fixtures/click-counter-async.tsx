/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [count, setCount] = createSignal(0);

runApp(() => (
  <box width={grow()} height={grow()} bg={rgba(10, 14, 22)}>
    <box
      width={fixed(30)}
      height={fixed(5)}
      padding={{ left: 2, top: 2 }}
      bg={rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
      focusable={true}
      onClick={async () => {
        await Promise.resolve();
        setCount((value) => value + 1);
      }}
    >
      <text color={rgba(255, 255, 255)}>Count: {count()}</text>
    </box>
  </box>
));
