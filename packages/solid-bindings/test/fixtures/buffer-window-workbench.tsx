/** @jsxImportSource @tui/solid-bindings */
import {
  ATTACH_POINT,
  ATTACH_TO,
  BufferWindow,
  createTranscriptBuffer,
  fixed,
  grow,
  rgba,
  runApp,
} from "@tui/solid-bindings";

const buffer = createTranscriptBuffer({
  id: "conversation",
  entries: [
    {
      key: "user-1",
      speaker: "user",
      kind: "user",
      text: "Can we move from raw viewport components to a proper buffer/window/compositor architecture?",
      containerBg: rgba(16, 28, 48),
      headerBg: rgba(24, 44, 74),
      bodyBg: rgba(16, 28, 48),
      badgeText: "QUESTION",
      badgeBg: rgba(42, 86, 150),
      badgeColor: rgba(236, 244, 255),
    },
    {
      key: "thinking-1",
      speaker: "assistant",
      kind: "thinking",
      text: "Yes. Treat windows as views onto buffers, keep prepared text and virtual items as the runtime substrate, and let floating windows become one official mode rather than the whole system. This longer block should wrap so the main window and preview window clearly diverge.",
      collapsedSummary: "Thinking hidden in preview window.",
      containerBg: rgba(34, 22, 52),
      headerBg: rgba(56, 33, 86),
      bodyBg: rgba(34, 22, 52),
      badgeText: "THINKING",
      badgeBg: rgba(104, 71, 154),
      badgeColor: rgba(244, 235, 255),
    },
    {
      key: "assistant-1",
      speaker: "assistant",
      kind: "assistant",
      text: "Main workbench windows can stay expanded while floating previews or inspectors render the same shared buffer with different local collapse state.",
      containerBg: rgba(17, 31, 50),
      headerBg: rgba(28, 53, 85),
      bodyBg: rgba(17, 31, 50),
      badgeText: "ANSWER",
      badgeBg: rgba(45, 92, 156),
      badgeColor: rgba(237, 245, 255),
    },
  ],
});

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(8, 12, 20)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(210, 226, 255)}>BufferWindow workbench demo — press q to quit</text>
    </box>

    <box width={grow()} height={grow()} padding={{ left: 2, right: 2, bottom: 1 }}>
      <BufferWindow
        buffer={buffer}
        window={{
          id: "main-workbench",
          bufferId: "conversation",
          mode: "docked",
          title: "Main conversation window",
          showTrack: true,
          chrome: {
            bg: rgba(10, 18, 31),
            contentBg: rgba(10, 18, 31),
            titleBg: rgba(19, 34, 56),
            titleColor: rgba(235, 242, 255),
            border: { color: rgba(81, 106, 145), left: 1, right: 1, top: 1, bottom: 1 },
            trackBg: rgba(10, 18, 31),
            trackActiveColor: rgba(133, 178, 255),
            trackInactiveColor: rgba(64, 85, 117),
          },
        }}
        width={grow()}
        height={grow()}
      />

      <BufferWindow
        buffer={buffer}
        window={{
          id: "floating-preview",
          bufferId: "conversation",
          mode: "floating",
          title: "Floating preview (collapsed thinking)",
          floating: {
            attachTo: ATTACH_TO.ROOT,
            attachPoints: {
              element: ATTACH_POINT.CENTER_CENTER,
              parent: ATTACH_POINT.CENTER_CENTER,
            },
            x: 18,
            y: 2,
            zIndex: 30,
          },
          viewState: {
            collapsedKeys: {
              "thinking-1": true,
            },
          },
          chrome: {
            bg: rgba(12, 17, 26),
            contentBg: rgba(12, 17, 26),
            titleBg: rgba(44, 29, 67),
            titleColor: rgba(247, 239, 255),
            border: { color: rgba(152, 118, 203), left: 1, right: 1, top: 1, bottom: 1 },
          },
        }}
        width={fixed(52)}
        height={fixed(10)}
      />
    </box>
  </box>
));
