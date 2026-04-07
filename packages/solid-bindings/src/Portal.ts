import type { OpNode } from "./opnode";

export function Portal(props: { children: OpNode }): OpNode {
  return props.children;
}
