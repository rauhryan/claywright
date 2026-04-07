import { close, createTerm, grow, open, type Op } from "clayterm";
import { ElementOpNode, type OpNode } from "./opnode";
import { createReconciler } from "./reconciler/index";
import { defaultReconcilerOptions } from "./reconciler/defaults";

export interface RenderOptions {
  width?: number;
  height?: number;
}

const reconciler = createReconciler(defaultReconcilerOptions);

export async function render(code: () => OpNode, options: RenderOptions = {}): Promise<void> {
  const width = options.width ?? process.stdout.columns ?? 80;
  const height = options.height ?? process.stdout.rows ?? 24;

  const term = await createTerm({ width, height });
  const root = new ElementOpNode("root", "root");
  const dispose = reconciler.render(code, root);

  const ops = collectOps(root);
  const { output } = term.render(ops);
  process.stdout.write(output);

  dispose();
}

function collectOps(root: ElementOpNode): Op[] {
  const ops: Op[] = [open("root", { layout: { width: grow(), height: grow() } })];
  for (const child of root.children) {
    ops.push(...child.toOps());
  }
  ops.push(close());
  return ops;
}
