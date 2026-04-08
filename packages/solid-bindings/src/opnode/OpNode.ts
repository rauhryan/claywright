import { fixed, fit, grow, percent, type Op, type SizingAxis } from "clayterm";

export function toSizingAxis(sizing?: {
  type: string;
  value?: number;
  min?: number;
  max?: number;
}): SizingAxis | undefined {
  if (!sizing) return undefined;
  switch (sizing.type) {
    case "fixed":
      return fixed(sizing.value ?? 0);
    case "grow":
      return grow(sizing.min, sizing.max);
    case "percent":
      return percent(sizing.value ?? 0);
    case "fit":
      return fit(sizing.min, sizing.max);
    default:
      return undefined;
  }
}

export abstract class OpNode {
  id: string;
  type: string;
  props: Record<string, unknown> = {};
  children: OpNode[] = [];
  parent: OpNode | null = null;
  protected _dirty: boolean = true;
  protected _destroyed: boolean = false;
  private _invalidationListener?: () => void;

  constructor(type: string, id: string) {
    this.type = type;
    this.id = id;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  markClean(): void {
    this._dirty = false;
  }

  setInvalidationListener(listener: (() => void) | undefined): void {
    this._invalidationListener = listener;
  }

  markDirty(): void {
    if (this._dirty) return;
    this._dirty = true;
    if (this.parent) {
      this.parent.markDirty();
      return;
    }
    this._invalidationListener?.();
  }

  abstract toOps(): Op[];

  add(child: OpNode, index?: number): number {
    if (child.parent && child.parent !== this) {
      child.parent.remove(child);
    }
    child.parent = this;
    if (index !== undefined) {
      this.children.splice(index, 0, child);
      this.markDirty();
      return index;
    }
    this.children.push(child);
    this.markDirty();
    return this.children.length - 1;
  }

  remove(child: OpNode): void {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
      this.markDirty();
    }
  }

  insertBefore(child: OpNode, anchor: OpNode): number {
    if (!anchor) {
      return this.add(child);
    }
    const idx = this.children.indexOf(anchor);
    if (idx >= 0) {
      return this.add(child, idx);
    }
    return this.add(child);
  }

  getFirstChild(): OpNode | undefined {
    return this.children[0];
  }

  getNextSibling(): OpNode | undefined {
    if (!this.parent) return undefined;
    const idx = this.parent.children.indexOf(this);
    return this.parent.children[idx + 1];
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    while (this.children.length > 0) {
      this.children[0]?.destroy();
    }
    this.children = [];

    if (this.parent) {
      this.parent.remove(this);
    }
  }

  protected toSizingAxis(sizing?: {
    type: string;
    value?: number;
    min?: number;
    max?: number;
  }): SizingAxis | undefined {
    return toSizingAxis(sizing);
  }
}
