import { OpNode } from "./OpNode";

export class TextOpNode extends OpNode {
  value: string;

  constructor(id: string, value: string) {
    super("text-node", id);
    this.value = value;
  }

  toOps(): never[] {
    return [];
  }

  replace(value: string): void {
    if (this.value !== value) {
      this.value = value;
      this.markDirty();
    }
  }
}
