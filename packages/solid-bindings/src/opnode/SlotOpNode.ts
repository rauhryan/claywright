import { OpNode } from "./OpNode";
import { TextOpNode } from "./TextOpNode";

export class SlotOpNode extends OpNode {
  private layoutSlot?: LayoutSlotOpNode;
  private textSlot?: TextSlotOpNode;

  constructor(id: string) {
    super("slot", id);
  }

  toOps(): never[] {
    return [];
  }

  getSlotChild(parent: OpNode): OpNode {
    if (this.isTextParent(parent)) {
      if (!this.textSlot) {
        this.textSlot = new TextSlotOpNode(`${this.id}-text`);
      }
      return this.textSlot;
    }

    if (!this.layoutSlot) {
      this.layoutSlot = new LayoutSlotOpNode(`${this.id}-layout`);
    }
    return this.layoutSlot;
  }

  private isTextParent(node: OpNode): boolean {
    return node.type === "text" || node instanceof TextOpNode;
  }
}

export class LayoutSlotOpNode extends OpNode {
  constructor(id: string) {
    super("layout-slot", id);
  }

  toOps(): never[] {
    return [];
  }
}

export class TextSlotOpNode extends OpNode {
  constructor(id: string) {
    super("text-slot", id);
  }

  toOps(): never[] {
    return [];
  }
}
