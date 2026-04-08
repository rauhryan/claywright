/** @jsxImportSource @tui/solid-bindings */
import {
  createStore,
  fixed,
  grow,
  isPending,
  latest,
  Loading,
  rgba,
  refresh,
  runApp,
} from "@tui/solid-bindings";

let version = 1;

const [result] = createStore(
  async () => {
    const current = version;
    if (current === 1) {
      return { value: "Result 1" };
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
    return { value: `Result ${current}` };
  },
  { value: "Result 1" },
);

setTimeout(() => {
  version = 2;
  refresh(result);
}, 120);

runApp(() => {
  const pendingState = () => isPending(() => result.value);
  const stale = () => latest(() => result.value);

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(120, 190, 255)}>Sibling stable</text>
      </box>

      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <text color={rgba(200, 200, 200)}>Pending: {pendingState() ? "yes" : "no"}</text>
      </box>

      <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
        <Loading fallback={<text color={rgba(255, 210, 90)}>Loading fallback</text>}>
          <text color={rgba(255, 255, 255)}>Latest: {stale() ?? "none"}</text>
        </Loading>
      </box>
    </box>
  );
});
