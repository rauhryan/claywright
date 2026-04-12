import { fixed } from "clayterm";
import { computeViewportTrackGeometry } from "./track";
import type { VirtualViewportState } from "./types";

export interface VirtualViewportTrackProps {
  id?: string;
  state: Pick<VirtualViewportState, "scrollTop" | "contentHeight" | "viewportHeight">;
  rows?: number;
  activeChar?: string;
  inactiveChar?: string;
  activeColor?: number;
  inactiveColor?: number;
  bg?: number;
}

export function VirtualViewportTrack(props: VirtualViewportTrackProps) {
  const activeChar = props.activeChar ?? "█";
  const inactiveChar = props.inactiveChar ?? "│";

  return (() => {
    const geometry = computeViewportTrackGeometry(props.state, props.rows);

    return (
      <box
        id={props.id}
        width={fixed(1)}
        height={fixed(geometry.trackSize)}
        direction="ttb"
        bg={props.bg}
      >
        {Array.from({ length: geometry.trackSize }, (_, index) => {
          const active = index >= geometry.thumbPos && index < geometry.thumbPos + geometry.thumbSize;
          return (
            <box width={fixed(1)} height={fixed(1)}>
              <text color={active ? props.activeColor : props.inactiveColor}>
                {active ? activeChar : inactiveChar}
              </text>
            </box>
          );
        })}
      </box>
    ) as never;
  }) as never;
}
