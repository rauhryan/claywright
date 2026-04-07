/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [focused, setFocused] = createSignal(false);
const [showBanner, setShowBanner] = createSignal(false);

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>Press b to toggle banner</text>
    </box>

    {showBanner() ? (
      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(255, 210, 90)}>Banner visible</text>
      </box>
    ) : null}

    <box
      id="focus-box"
      width={fixed(30)}
      height={fixed(5)}
      padding={{ left: 2, top: 2 }}
      bg={focused() ? rgba(100, 200, 100) : rgba(100, 149, 237)}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
      focusable={true}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        const keyboardEvent = event as { key?: string; code?: string };
        if (keyboardEvent.key?.toLowerCase() === "b" || keyboardEvent.code === "KeyB") {
          setShowBanner((value) => !value);
        }
      }}
    >
      <text color={rgba(255, 255, 255)}>{focused() ? "FOCUSED" : "Click to focus"}</text>
    </box>

    <box width={grow()} height={fixed(3)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 200, 200)}>Banner: {showBanner() ? "on" : "off"}</text>
    </box>
  </box>
));
