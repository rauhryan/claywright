/** @jsxImportSource @tui/solid-bindings */
import { createSignal } from "solid-js";
import { createStore, fixed, grow, rgba, runApp, Show } from "@tui/solid-bindings";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const [mounted, setMounted] = createSignal(true);

async function* stream(): AsyncGenerator<{ value: string }> {
  yield { value: "one" };
  await delay(30);
  yield { value: "two" };
  await delay(60);
  yield { value: "three" };
}

const [state] = createStore(() => stream(), { value: "seed" });

setTimeout(() => {
  setMounted(false);
}, 70);

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(120, 190, 255)}>Sibling stable</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 200, 200)}>Mounted: {mounted() ? "yes" : "no"}</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <Show when={mounted()} fallback={<text color={rgba(255, 210, 90)}>Unmounted</text>}>
        <text color={rgba(255, 255, 255)}>Stream: {state.value}</text>
      </Show>
    </box>
  </box>
));
