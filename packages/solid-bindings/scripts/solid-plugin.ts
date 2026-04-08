import { plugin } from "bun";
import { transformSolidJSX } from "./solid-transform.ts";

function sourcePath(path: string): string {
  const searchIndex = path.indexOf("?");
  const hashIndex = path.indexOf("#");
  const end = [searchIndex, hashIndex].filter((index) => index >= 0).toSorted((a, b) => a - b)[0];
  return end === undefined ? path : path.slice(0, end);
}

export const solidPlugin = plugin({
  name: "solid-jsx",
  setup(build) {
    // Keep Solid on the live client runtime in this CLI package.
    // Bun resolves `solid-js` to the server build under node conditions,
    // which breaks reactivity for mounted apps. Do not remove this remap
    // unless the runtime issue itself is resolved and verified end-to-end.
    build.onLoad(
      { filter: /[/\\]node_modules[/\\]solid-js[/\\]dist[/\\]server\.js(?:[?#].*)?$/ },
      async (args) => {
        const path = sourcePath(args.path).replace("server.js", "solid.js");
        const file = Bun.file(path);
        const code = await file.text();
        return { contents: code, loader: "js" };
      },
    );

    build.onLoad(
      { filter: /[/\\]node_modules[/\\]solid-js[/\\]store[/\\]dist[/\\]server\.js(?:[?#].*)?$/ },
      async (args) => {
        const path = sourcePath(args.path).replace("server.js", "store.js");
        const file = Bun.file(path);
        const code = await file.text();
        return { contents: code, loader: "js" };
      },
    );

    build.onLoad({ filter: /\.(js|ts)x(?:[?#].*)?$/ }, async (args) => {
      const path = sourcePath(args.path);
      const file = Bun.file(path);
      const code = await file.text();
      const transformed = await transformSolidJSX(code, path, "@tui/solid-bindings");
      return { contents: transformed, loader: "js" };
    });
  },
});
