/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [count, setCount] = createSignal(0);
const [last, setLast] = createSignal("none");

runApp(() => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>
        Wheel: {last()} {count()}
      </text>
    </box>

    <box
      bg={rgba(40, 52, 72)}
      height={fixed(3)}
      id="target"
      onWheel={(event) => {
        setLast(`${event.direction}@${event.x},${event.y}`);
        setCount((value) => value + 1);
      }}
      width={fixed(20)}
    >
      <text color={rgba(255, 255, 255)}>Target box</text>
    </box>

    <box height={fixed(1)} width={grow()}>
      <text color={rgba(180, 180, 180)}>Outside area</text>
    </box>
  </box>
));
