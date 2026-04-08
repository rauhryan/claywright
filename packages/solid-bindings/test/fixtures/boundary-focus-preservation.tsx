/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { Errored, fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [shouldThrow, setShouldThrow] = createSignal(false);
const [leftFocused, setLeftFocused] = createSignal(false);
const [lastKeyTarget, setLastKeyTarget] = createSignal("none");

function MaybeCrash() {
  if (shouldThrow()) {
    throw new Error("boom");
  }

  return <text color={rgba(255, 255, 255)}>Healthy content</text>;
}

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(235, 240, 255)}>Boundary Focus Preservation</text>
    </box>

    <box direction="ltr" height={fixed(6)} padding={{ left: 2, top: 1 }} gap={2}>
      <box
        id="stable-left"
        width={fixed(22)}
        height={fixed(4)}
        padding={{ left: 1, top: 1 }}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        bg={rgba(50, 70, 110)}
        focusable={true}
        onFocus={() => setLeftFocused(true)}
        onBlur={() => setLeftFocused(false)}
        onKeyDown={(event) => {
          const keyboardEvent = event as { key?: string };
          if (keyboardEvent.key?.toLowerCase() === "e") {
            setShouldThrow(true);
          }
          if (keyboardEvent.key?.toLowerCase() === "x") {
            setLastKeyTarget("left");
          }
        }}
      >
        <text color={rgba(255, 255, 255)}>{leftFocused() ? "LEFT FOCUSED" : "Click left"}</text>
      </box>
      <box
        width={fixed(24)}
        height={fixed(4)}
        padding={{ left: 1, top: 1 }}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        bg={rgba(90, 55, 80)}
      >
        <Errored fallback={<text color={rgba(255, 120, 120)}>Errored fallback</text>}>
          <MaybeCrash />
        </Errored>
      </box>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(255, 210, 90)}>Last key target: {lastKeyTarget()}</text>
    </box>
  </box>
));
