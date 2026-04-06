/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [focused, setFocused] = createSignal(false);
const [value, setValue] = createSignal("");

runApp(() => (
  <box
    bg={rgba(10, 14, 22)}
    direction="ttb"
    height={grow()}
    padding={{ left: 2, top: 1 }}
    width={grow()}
  >
    <box
      bg={rgba(30, 36, 48)}
      border={{
        bottom: 1,
        color: focused() ? rgba(255, 210, 90) : rgba(90, 140, 255),
        left: 1,
        right: 1,
        top: 1,
      }}
      height={fixed(3)}
      padding={{ left: 1, top: 1 }}
      width={fixed(20)}
    >
      <input
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onInput={setValue}
        placeholder="Type here"
        value={value()}
      />
    </box>
    <box height={fixed(2)} padding={{ top: 1 }} width={grow()}>
      <text color={rgba(200, 200, 200)}>Value: {value()}</text>
    </box>
    <box height={fixed(2)} width={grow()}>
      <text color={rgba(120, 190, 255)}>Focused: {focused() ? "yes" : "no"}</text>
    </box>
    <box height={fixed(2)} width={grow()}>
      <text color={rgba(255, 210, 90)}>Caret: {focused() ? "visible" : "hidden"}</text>
    </box>
  </box>
));
