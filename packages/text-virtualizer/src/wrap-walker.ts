import { skipAnsiSequence } from "@tui/text-measure";

export function computeDisplayWidth(text: string, measureWidth: (text: string) => number): number {
  let width = 0;
  let i = 0;
  while (i < text.length) {
    let skip = skipAnsiSequence(text, i);
    if (skip > 0) {
      i += skip;
      continue;
    }
    let cp = text.codePointAt(i)!;
    let charLen = cp > 0xffff ? 2 : 1;
    width += measureWidth(String.fromCodePoint(cp));
    i += charLen;
  }
  return width;
}

export function computeWrapPoints(
  text: string,
  columns: number,
  measureWidth: (text: string) => number,
): number[] {
  let wrapPoints: number[] = [];
  let col = 0;
  let i = 0;

  while (i < text.length) {
    let skip = skipAnsiSequence(text, i);
    if (skip > 0) {
      i += skip;
      continue;
    }

    let cp = text.codePointAt(i)!;
    let charLen = cp > 0xffff ? 2 : 1;
    let w = measureWidth(String.fromCodePoint(cp));

    if (col > 0 && col + w > columns) {
      wrapPoints.push(i);
      col = 0;
    }

    col += w;
    i += charLen;
  }

  return wrapPoints;
}
