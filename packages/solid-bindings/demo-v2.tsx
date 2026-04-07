/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { runApp } from "@tui/solid-bindings";
import { grow } from "@tui/solid-bindings";

function App() {
  const [count] = createSignal(0);

  return (
    <box
      direction="ttb"
      width={grow()}
      height={grow()}
      padding={{ left: 2, right: 2, top: 1, bottom: 1 }}
    >
      <text>=== OpNode Demo ===</text>
      <text></text>
      <text>Count: {count()}</text>
      <text></text>
      <text>Press +/- to change, q to quit</text>
    </box>
  );
}

runApp(() => App(), { width: 60, height: 20 });
