/** @jsxImportSource @tui/solid-bindings */
import {
  action,
  createOptimisticStore,
  createSignal,
  fixed,
  grow,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const [serverStage, setServerStage] = createSignal("idle");
const [view, setView] = createOptimisticStore(() => ({ stage: serverStage() }), { stage: "idle" });

const succeed = action(function* () {
  setView((state) => {
    state.stage = "queued";
  });
  yield delay(20);
  setView((state) => {
    state.stage = "saving";
  });
  yield delay(20);
  setServerStage("done");
});

const fail = action(function* () {
  setView((state) => {
    state.stage = "queued";
  });
  yield delay(20);
  setView((state) => {
    state.stage = "saving";
  });
  yield delay(20);
  throw new Error("boom");
});

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(10, 14, 22)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(235, 240, 255)}>Generator Action Demo</text>
    </box>

    <box direction="ltr" height={fixed(4)} padding={{ left: 2, top: 1 }} gap={2}>
      <box
        width={fixed(18)}
        height={fixed(3)}
        padding={{ left: 1, top: 1 }}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        bg={rgba(50, 70, 110)}
        focusable={true}
        onClick={() => {
          setServerStage("idle");
          void succeed();
        }}
      >
        <text color={rgba(255, 255, 255)}>Run success</text>
      </box>

      <box
        width={fixed(18)}
        height={fixed(3)}
        padding={{ left: 1, top: 1 }}
        border={{ color: rgba(255, 255, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        bg={rgba(110, 60, 60)}
        focusable={true}
        onClick={() => {
          setServerStage("idle");
          void fail().catch(() => {});
        }}
      >
        <text color={rgba(255, 255, 255)}>Run rollback</text>
      </box>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(255, 210, 90)}>Stage: {view.stage}</text>
    </box>
  </box>
));
