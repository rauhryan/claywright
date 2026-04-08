export * from "./runtime";

export const examples = {
  "basic-button": new URL("./examples/basic-button.ts", import.meta.url).pathname,
  "carousel-track": new URL("./examples/carousel-track.ts", import.meta.url).pathname,
  "carousel-floating": new URL("./examples/carousel-floating.ts", import.meta.url).pathname,
  "carousel-transition": new URL("./examples/carousel-transition.ts", import.meta.url).pathname,
  "knight-rider": new URL("./examples/knight-rider.ts", import.meta.url).pathname,
  "modal-menu": new URL("./examples/modal-menu.ts", import.meta.url).pathname,
  selection: new URL("./examples/selection.ts", import.meta.url).pathname,
} as const;

export type ExampleName = keyof typeof examples;
