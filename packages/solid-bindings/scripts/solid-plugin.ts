import { plugin } from "bun";
import { transformSolidJSX } from "./solid-transform.ts";

export const solidPlugin = plugin({
  name: "solid-jsx",
  setup(build) {
    build.onLoad({ filter: /\.(js|ts)x$/ }, async (args) => {
      const file = Bun.file(args.path);
      const code = await file.text();
      const transformed = await transformSolidJSX(code, args.path, "@tui/solid-bindings");
      return { contents: transformed, loader: "js" };
    });
  },
});
