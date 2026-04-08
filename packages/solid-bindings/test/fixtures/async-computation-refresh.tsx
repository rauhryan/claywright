/** @jsxImportSource @tui/solid-bindings */
import {
  createSignal,
  createStore,
  fixed,
  grow,
  isPending,
  latest,
  refresh,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let version = 1;

const [leftFocused, setLeftFocused] = createSignal(false);
const [lastKeyTarget, setLastKeyTarget] = createSignal("none");

const [result] = createStore(
  async (): Promise<{ value: string }> => {
    const current = version;
    if (current === 1) {
      return { value: "Result 1" };
    }

    await delay(80);
    return { value: `Result ${current}` };
  },
  { value: "Result 1" },
);

setTimeout(() => {
  version = 2;
  refresh(result);
}, 120);

runApp(() => {
  const pending = () => isPending(() => result.value);
  const staleValue = () => latest(() => result.value);

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(235, 240, 255)}>Async Refresh Demo</text>
      </box>

      <box direction="ltr" height={fixed(5)} padding={{ left: 2, top: 1 }} gap={2}>
        <box
          width={fixed(20)}
          height={fixed(3)}
          padding={{ left: 1, top: 1 }}
          border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
          bg={rgba(50, 70, 110)}
          focusable={true}
          onFocus={() => setLeftFocused(true)}
          onBlur={() => setLeftFocused(false)}
          onKeyDown={(event) => {
            const keyboardEvent = event as { key?: string };
            if (keyboardEvent.key?.toLowerCase() === "x") {
              setLastKeyTarget("left");
            }
          }}
        >
          <text color={rgba(255, 255, 255)}>{leftFocused() ? "LEFT FOCUSED" : "Click left"}</text>
        </box>

        <box
          width={fixed(28)}
          height={fixed(3)}
          padding={{ left: 1, top: 1 }}
          border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
          bg={rgba(70, 55, 95)}
        >
          <text color={rgba(255, 255, 255)}>Async value: {staleValue() ?? "none"}</text>
        </box>
      </box>

      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(200, 200, 200)}>Pending: {pending() ? "yes" : "no"}</text>
      </box>

      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(255, 210, 90)}>Last key target: {lastKeyTarget()}</text>
      </box>
    </box>
  );
});
