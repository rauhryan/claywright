/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [firstFocused, setFirstFocused] = createSignal(false);
const [secondFocused, setSecondFocused] = createSignal(false);
const [thirdFocused, setThirdFocused] = createSignal(false);

runApp(() => (
  <box
    bg={rgba(10, 14, 22)}
    direction="ttb"
    height={grow()}
    padding={{ left: 2, top: 1 }}
    width={grow()}
  >
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(235, 240, 255)}>Tab Navigation Demo</text>
    </box>

    <box height={fixed(3)} width={grow()}>
      <input
        onBlur={() => setFirstFocused(false)}
        onFocus={() => setFirstFocused(true)}
        placeholder="First"
      />
    </box>

    <box height={fixed(3)} width={grow()}>
      <input
        onBlur={() => setSecondFocused(false)}
        onFocus={() => setSecondFocused(true)}
        placeholder="Second"
      />
    </box>

    <box height={fixed(3)} width={grow()}>
      <input
        onBlur={() => setThirdFocused(false)}
        onFocus={() => setThirdFocused(true)}
        placeholder="Third"
      />
    </box>

    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 210, 90)}>First: {firstFocused() ? "yes" : "no"}</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 210, 90)}>Second: {secondFocused() ? "yes" : "no"}</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 210, 90)}>Third: {thirdFocused() ? "yes" : "no"}</text>
    </box>
  </box>
));
