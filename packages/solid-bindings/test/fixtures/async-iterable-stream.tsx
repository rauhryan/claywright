/** @jsxImportSource @tui/solid-bindings */
import { createStore, fixed, grow, rgba, runApp } from "@tui/solid-bindings";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function* stream(): AsyncGenerator<{ value: string }> {
  yield { value: "one" };
  await delay(30);
  yield { value: "two" };
  await delay(30);
  yield { value: "three" };
}

const [state] = createStore(() => stream(), { value: "seed" });

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>Sibling stable</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(255, 255, 255)}>Stream: {state.value}</text>
    </box>
  </box>
));
