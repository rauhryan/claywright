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

let serverVersion = 0;

const [todos, setTodos] = createOptimisticStore(async (): Promise<
  Array<{ id: number; title: string }>
> => {
  const current = serverVersion;
  if (current === 0) {
    return [{ id: 1, title: "server-0" }];
  }

  await delay(60);
  return [{ id: 1, title: `server-${current}` }];
}, []);

const save = action(function* () {
  setTodos((list) => {
    list[0] = { id: 1, title: "optimistic" };
  });
  serverVersion = 1;
  yield delay(20);
  refresh(todos);
});

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box
      width={fixed(28)}
      height={fixed(4)}
      padding={{ left: 1, top: 1 }}
      border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
      bg={rgba(50, 70, 110)}
      focusable={true}
      onClick={() => {
        void save();
      }}
    >
      <text color={rgba(255, 255, 255)}>Todo: {todos[0]?.title ?? "none"}</text>
    </box>
  </box>
));
