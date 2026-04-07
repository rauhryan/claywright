/** @jsxImportSource @tui/solid-bindings */
import { ATTACH_POINT, ATTACH_TO } from "clayterm";
import { fixed, grow, rgba, runApp, Portal } from "@tui/solid-bindings";

runApp(() => (
  <box width={grow()} height={grow()} direction="ttb" bg={rgba(8, 12, 18)}>
    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(200, 220, 255)}>Top marker</text>
    </box>

    <box height={fixed(2)} padding={{ left: 2, top: 1 }}>
      <text color={rgba(170, 170, 170)}>Bottom marker</text>
    </box>

    <Portal>
      <box
        width={fixed(26)}
        height={fixed(5)}
        direction="ttb"
        padding={{ left: 2, top: 1 }}
        bg={rgba(28, 44, 74)}
        border={{ color: rgba(222, 232, 255), left: 1, right: 1, top: 1, bottom: 1 }}
        floating={{
          attachTo: ATTACH_TO.ROOT,
          attachPoints: {
            element: ATTACH_POINT.CENTER_CENTER,
            parent: ATTACH_POINT.CENTER_CENTER,
          },
          zIndex: 30,
        }}
      >
        <text color={rgba(255, 255, 255)}>PORTAL MODAL</text>
      </box>
    </Portal>
  </box>
));
