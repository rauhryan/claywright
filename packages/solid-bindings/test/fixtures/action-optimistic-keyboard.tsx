/** @jsxImportSource @tui/solid-bindings */
import {
  action,
  createOptimisticStore,
  fixed,
  grow,
  refresh,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let serverValue = "server";

const [view, setView] = createOptimisticStore(
  async (): Promise<{ input: string }> => {
    const current = serverValue;
    if (current === "server") {
      return { input: current };
    }

    await delay(60);
    return { input: current };
  },
  { input: "server" },
);

const commit = action(function* () {
  setView((state) => {
    state.input = "optimistic";
  });
  serverValue = "saved";
  yield delay(20);
  refresh(view);
});

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(235, 240, 255)}>Keyboard Action Demo</text>
    </box>

    <box height={fixed(4)} padding={{ left: 2, top: 1 }}>
      <input
        value={view.input}
        onKeyDown={(event) => {
          const keyboardEvent = event as { key?: string; preventDefault?: () => void };
          if (keyboardEvent.key?.toLowerCase() === "s") {
            keyboardEvent.preventDefault?.();
            void commit();
          }
        }}
      />
    </box>
  </box>
));
