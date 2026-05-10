export const ATTACH_POINT = {
  LEFT_TOP: "left-top",
  LEFT_CENTER: "left-center",
  LEFT_BOTTOM: "left-bottom",
  CENTER_TOP: "center-top",
  CENTER_CENTER: "center-center",
  CENTER_BOTTOM: "center-bottom",
  RIGHT_TOP: "right-top",
  RIGHT_CENTER: "right-center",
  RIGHT_BOTTOM: "right-bottom",
} as const;

export const ATTACH_TO = {
  NONE: "none",
  PARENT: "parent",
  ELEMENT: "element",
  ROOT: "root",
} as const;

export const POINTER_CAPTURE_MODE = {
  CAPTURE: "capture",
  PASSTHROUGH: "passthrough",
} as const;

export const CLIP_TO = {
  NONE: "none",
  ATTACHED_PARENT: "attached-parent",
} as const;
