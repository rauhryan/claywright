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
