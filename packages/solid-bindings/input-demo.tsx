/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [focused, setFocused] = createSignal(false);
const [value, setValue] = createSignal("");

runApp(({ pointer }) => (
  <box
    bg={rgba(10, 14, 22)}
    direction="ttb"
    height={grow()}
    padding={{ left: 2, top: 1 }}
    width={grow()}
  >
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(235, 240, 255)}>Input Demo</text>
    </box>

    <box height={fixed(1)} width={grow()}>
      <text color={rgba(150, 170, 210)}>
        Click the field, type, use arrows/backspace, click away to blur.
      </text>
    </box>

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
      width={fixed(28)}
    >
      <input
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onInput={setValue}
        placeholder="Type here"
        value={value()}
      />
    </box>

    <box height={fixed(2)} width={grow()}>
      <text color={rgba(200, 200, 200)}>Value: {value() || "<empty>"}</text>
    </box>

    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 210, 90)}>Focus: {focused() ? "yes" : "no"}</text>
    </box>

    <box height={fixed(1)} width={grow()}>
      <text color={rgba(140, 210, 255)}>
        Pointer: ({pointer.x}, {pointer.y}) {pointer.down ? "DOWN" : ""}
      </text>
    </box>

    <box height={fixed(1)} padding={{ top: 1 }} width={grow()}>
      <text color={rgba(120, 190, 255)}>Press Q or Ctrl+C to exit</text>
    </box>
  </box>
));
