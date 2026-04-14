/** @jsxImportSource @tui/solid-bindings */
import {
  ATTACH_POINT,
  AuthoredBufferWorkspace,
  AuthoredExternalBuffer,
  AuthoredPreparedTextBlock,
  AuthoredPreparedTextBuffer,
  AuthoredWindow,
  createSignal,
  createTextStreamBuffer,
  fixed,
  grow,
  markStatefulComponent,
  onCleanup,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const stream = createTextStreamBuffer({
  id: "shared-stream",
  maxLines: 96,
  lines: ["BEGIN", ...Array.from({ length: 30 }, (_, index) => `Stream Row ${index + 1}`)],
  initialAutoFollow: true,
});

function AuthoredInspectorWorkspace(props: { workspaceHeight: number }) {
  const [mainTopRow, setMainTopRow] = createSignal(1);
  const [floatTopRow, setFloatTopRow] = createSignal(1);
  const [appended, setAppended] = createSignal(0);

  const timer = setInterval(() => {
    setAppended((count) => {
      const next = count + 1;
      stream.appendLine(`Tail Row ${next}`);
      return next;
    });
  }, 300);

  onCleanup(() => clearInterval(timer));

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(8, 12, 20)}>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(220, 232, 255)}>Authored workspace demo — appended: {appended()}</text>
      </box>
      <box height={fixed(1)} direction="ltr" gap={3} padding={{ left: 1 }}>
        <text color={rgba(160, 196, 255)}>MainTopRow: {mainTopRow()}</text>
        <text color={rgba(225, 201, 255)}>FloatTopRow: {floatTopRow()}</text>
      </box>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(166, 188, 220)}>
          External shared stream windows stay stable while the authored inspector buffer updates.
        </text>
      </box>

      <AuthoredBufferWorkspace
        height={fixed(props.workspaceHeight)}
        bg={rgba(8, 12, 20)}
        windowProps={{
          "main-window": {
            height: fixed(props.workspaceHeight),
            onStateChange: (state) => {
              setMainTopRow(state.scrollTop + 1);
            },
          },
          "floating-window": {
            width: fixed(28),
            height: fixed(7),
            onStateChange: (state) => {
              setFloatTopRow(state.scrollTop + 1);
            },
          },
          "inspector-window": {
            width: fixed(28),
            height: fixed(8),
          },
        }}
      >
        {() => [
          <AuthoredExternalBuffer buffer={stream} />,
          <AuthoredPreparedTextBuffer id="inspector" initialAutoFollow={false}>
            <AuthoredPreparedTextBlock
              key="status"
              text={`Inspector appended: ${appended()}\nShared buffer: shared-stream\nMain stays pinned; floating preview follows the tail.`}
            />
            <AuthoredPreparedTextBlock
              key="details"
              text="This inspector buffer is authored through semantic JSX descriptors and recompiles independently of the external text stream windows."
            />
          </AuthoredPreparedTextBuffer>,
          <AuthoredWindow
            id="main-window"
            bufferId="shared-stream"
            mode="docked"
            title="Main stream window"
            initialAutoFollow={false}
            chrome={{
              bg: rgba(10, 18, 30),
              contentBg: rgba(10, 18, 30),
              titleBg: rgba(22, 38, 64),
              titleColor: rgba(235, 242, 255),
              border: { color: rgba(84, 109, 146), left: 1, right: 1, top: 1, bottom: 1 },
            }}
          />,
          <AuthoredWindow
            id="floating-window"
            bufferId="shared-stream"
            mode="floating"
            title="Floating tail preview"
            initialAutoFollow={true}
            floating={{
              attachPoints: {
                element: ATTACH_POINT.LEFT_TOP,
                parent: ATTACH_POINT.LEFT_TOP,
              },
              x: 22,
              y: 6,
              zIndex: 40,
            }}
            chrome={{
              bg: rgba(19, 14, 32),
              contentBg: rgba(19, 14, 32),
              titleBg: rgba(53, 37, 86),
              titleColor: rgba(247, 240, 255),
              border: { color: rgba(154, 122, 205), left: 1, right: 1, top: 1, bottom: 1 },
            }}
          />,
          <AuthoredWindow
            id="inspector-window"
            bufferId="inspector"
            mode="floating"
            title="Authored inspector"
            floating={{
              attachPoints: {
                element: ATTACH_POINT.LEFT_TOP,
                parent: ATTACH_POINT.LEFT_TOP,
              },
              x: 46,
              y: 4,
              zIndex: 50,
            }}
            chrome={{
              bg: rgba(13, 21, 19),
              contentBg: rgba(13, 21, 19),
              titleBg: rgba(26, 58, 49),
              titleColor: rgba(236, 255, 246),
              border: { color: rgba(86, 148, 126), left: 1, right: 1, top: 1, bottom: 1 },
            }}
          />,
        ]}
      </AuthoredBufferWorkspace>
    </box>
  ) as never;
}

markStatefulComponent(AuthoredInspectorWorkspace);

runApp((ctx) => <AuthoredInspectorWorkspace workspaceHeight={Math.max(ctx.height - 3, 1)} />);
