/** @jsxImportSource @tui/solid-bindings */
import { createSignal, fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const [status, setStatus] = createSignal("idle");

function pushStatus(next: string): void {
  setStatus((current) => (current === "idle" ? next : `${current} | ${next}`));
}

runApp(() => (
  <box bg={rgba(10, 14, 22)} direction="ttb" height={grow()} width={grow()}>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Mouse Events Demo</text>
    </box>
    <box height={fixed(1)} width={grow()}>
      <text color={rgba(255, 255, 255)}>Status: {status()}</text>
    </box>
    <box
      id="target"
      bg={rgba(40, 52, 72)}
      height={fixed(4)}
      width={fixed(20)}
      onMouseMove={(event) => pushStatus(`mv@${event.x},${event.y}`)}
      onMouseDown={() => pushStatus("down")}
      onMouseUp={() => pushStatus("up")}
      onClick={() => pushStatus("click")}
      onWheel={(event) => pushStatus(`wh:${event.direction[0]}@${event.x},${event.y}`)}
    >
      <text color={rgba(255, 255, 255)}>Target box</text>
    </box>
  </box>
));
