import type { OpNode } from "./opnode";

export function Portal(props: { children: unknown }): OpNode {
  return props.children as OpNode;
}
