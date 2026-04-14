/** @jsxImportSource @tui/solid-bindings */
import {
  ATTACH_POINT,
  BufferWorkspace,
  createPreparedTextBuffer,
  createSignal,
  fixed,
  grow,
  markStatefulComponent,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const mainRows = [
  "BEGIN",
  ...Array.from({ length: 24 }, (_, index) => `Main Row ${index + 1}`),
  "END",
];

const floatRows = [
  "BEGIN",
  ...Array.from({ length: 12 }, (_, index) => `Float Row ${index + 1}`),
  "END",
];

const mainBuffer = createPreparedTextBuffer({
  id: "main-buffer",
  blocks: mainRows.map((text, index) => ({
    key: `main-${index + 1}`,
    text,
    estimatedElementsPerRow: 1,
    estimatedMeasuredWords: 3,
  })),
});

const floatingBuffer = createPreparedTextBuffer({
  id: "floating-buffer",
  blocks: floatRows.map((text, index) => ({
    key: `float-${index + 1}`,
    text,
    estimatedElementsPerRow: 1,
    estimatedMeasuredWords: 3,
  })),
});

function WorkspaceScreen(props: { workspaceHeight: number }) {
  const [mainStatus, setMainStatus] = createSignal("idle");
  const [floatStatus, setFloatStatus] = createSignal("idle");

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(8, 12, 20)}>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(220, 232, 255)}>MainStatus: {mainStatus()}</text>
      </box>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(240, 220, 255)}>FloatStatus: {floatStatus()}</text>
      </box>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(166, 188, 220)}>
          Click exposed main area or overlapping floating area. Wheel is enabled. Press q to quit.
        </text>
      </box>

      <BufferWorkspace
        buffers={[mainBuffer, floatingBuffer]}
        windows={[
          {
            id: "main-window",
            bufferId: "main-buffer",
            mode: "docked",
            title: "Main docked buffer",
            initialAutoFollow: false,
            chrome: {
              bg: rgba(10, 18, 30),
              contentBg: rgba(10, 18, 30),
              titleBg: rgba(22, 38, 64),
              titleColor: rgba(235, 242, 255),
              border: { color: rgba(84, 109, 146), left: 1, right: 1, top: 1, bottom: 1 },
            },
          },
          {
            id: "floating-window",
            bufferId: "floating-buffer",
            mode: "floating",
            title: "Floating overlay",
            initialAutoFollow: false,
            floating: {
              attachPoints: {
                element: ATTACH_POINT.LEFT_TOP,
                parent: ATTACH_POINT.LEFT_TOP,
              },
              x: 18,
              y: 6,
              zIndex: 40,
            },
            chrome: {
              bg: rgba(19, 14, 32),
              contentBg: rgba(19, 14, 32),
              titleBg: rgba(53, 37, 86),
              titleColor: rgba(247, 240, 255),
              border: { color: rgba(154, 122, 205), left: 1, right: 1, top: 1, bottom: 1 },
            },
          },
        ]}
        height={fixed(props.workspaceHeight)}
        bg={rgba(8, 12, 20)}
        windowProps={{
          "main-window": {
            height: fixed(props.workspaceHeight),
            onClick: (event) => {
              setMainStatus(`click@${event.x},${event.y}`);
            },
            onWheel: (event) => {
              setMainStatus(`wheel:${event.direction}@${event.x},${event.y}`);
            },
          },
          "floating-window": {
            width: fixed(28),
            height: fixed(7),
            onClick: (event) => {
              setFloatStatus(`click@${event.x},${event.y}`);
            },
            onWheel: (event) => {
              setFloatStatus(`wheel:${event.direction}@${event.x},${event.y}`);
            },
          },
        }}
      />
    </box>
  ) as never;
}

markStatefulComponent(WorkspaceScreen);

runApp((ctx) => <WorkspaceScreen workspaceHeight={Math.max(ctx.height - 3, 1)} />);
