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
  ...Array.from({ length: 36 }, (_, index) => `Main Row ${index + 1}`),
  "END",
];

const floatRows = [
  "BEGIN",
  ...Array.from({ length: 32 }, (_, index) => `Float Row ${index + 1}`),
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

function FocusWorkspaceScreen(props: { workspaceHeight: number }) {
  const [activeWindowId, setActiveWindowId] = createSignal<string | undefined>("main-window");
  const [mainTopRow, setMainTopRow] = createSignal(1);
  const [floatTopRow, setFloatTopRow] = createSignal(1);

  const windows = [
    {
      id: "main-window",
      bufferId: "main-buffer",
      mode: "docked" as const,
      title: "Main workspace window",
      initialAutoFollow: false,
      showTrack: true,
      chrome: {
        bg: rgba(10, 18, 30),
        contentBg: rgba(10, 18, 30),
        titleBg: rgba(22, 38, 64),
        titleColor: rgba(235, 242, 255),
        border: {
          color: rgba(84, 109, 146),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        trackBg: rgba(10, 18, 30),
        trackActiveColor: rgba(116, 143, 186),
        trackInactiveColor: rgba(64, 85, 117),
      },
    },
    {
      id: "floating-window",
      bufferId: "floating-buffer",
      mode: "floating" as const,
      title: "Floating focus preview",
      initialAutoFollow: false,
      showTrack: true,
      floating: {
        attachPoints: {
          element: ATTACH_POINT.LEFT_TOP,
          parent: ATTACH_POINT.LEFT_TOP,
        },
        x: 22,
        y: 6,
        zIndex: 45,
      },
      chrome: {
        bg: rgba(19, 14, 32),
        contentBg: rgba(19, 14, 32),
        titleBg: rgba(53, 37, 86),
        titleColor: rgba(247, 240, 255),
        border: {
          color: rgba(154, 122, 205),
          left: 1,
          right: 1,
          top: 1,
          bottom: 1,
        },
        trackBg: rgba(19, 14, 32),
        trackActiveColor: rgba(181, 155, 227),
        trackInactiveColor: rgba(92, 74, 125),
      },
    },
  ];

  return (
    <box width={grow()} height={grow()} direction="ttb" bg={rgba(8, 12, 20)}>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(220, 232, 255)}>ActiveWindow: {activeWindowId() ?? "none"}</text>
      </box>
      <box height={fixed(1)} direction="ltr" gap={3} padding={{ left: 1 }}>
        <text color={rgba(160, 196, 255)}>MainTopRow: {mainTopRow()}</text>
        <text color={rgba(225, 201, 255)}>FloatTopRow: {floatTopRow()}</text>
      </box>
      <box height={fixed(1)} padding={{ left: 1 }}>
        <text color={rgba(166, 188, 220)}>
          Tab focuses the workspace, ] cycles the active window, PageDown scrolls it, q quits.
        </text>
      </box>

      <BufferWorkspace
        buffers={[mainBuffer, floatingBuffer]}
        windows={windows}
        activeWindowId={activeWindowId()}
        onActiveWindowChange={setActiveWindowId}
        manageKeyboardFocus
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
            width: fixed(30),
            height: fixed(8),
            onStateChange: (state) => {
              setFloatTopRow(state.scrollTop + 1);
            },
          },
        }}
      />
    </box>
  ) as never;
}

markStatefulComponent(FocusWorkspaceScreen);

runApp((ctx) => <FocusWorkspaceScreen workspaceHeight={Math.max(ctx.height - 3, 1)} />);
