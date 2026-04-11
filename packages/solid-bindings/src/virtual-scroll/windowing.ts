import type { TextMeasureApi } from "clayterm";
import { MeasurementCache } from "./measurement-cache";
import type { MeasuredItem, VirtualItem, VirtualViewportBudget, WindowLayout } from "./types";

export function assertFiniteNonNegative(name: string, value: number | undefined): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number; received ${value}`);
  }
}

export function validateItemKeys(items: readonly VirtualItem[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) {
      throw new Error(`Duplicate virtual item key \`${item.key}\`.`);
    }
    seen.add(item.key);
  }
}

export function measureItems(
  items: readonly VirtualItem[],
  width: number,
  measure: TextMeasureApi,
  cache: MeasurementCache,
): MeasuredItem[] {
  validateItemKeys(items);

  let offset = 0;
  return items.map((item) => {
    const measurement = cache.get(item, width, measure);
    const measured: MeasuredItem = {
      item,
      key: item.key,
      version: item.version,
      height: measurement.height,
      offset,
      estimatedElements: measurement.estimatedElements ?? 0,
      estimatedMeasuredWords: measurement.estimatedMeasuredWords ?? 0,
    };
    offset += measurement.height;
    return measured;
  });
}

export function computeWindowLayout(
  measured: MeasuredItem[],
  scrollTop: number,
  viewportHeight: number,
  overscanRows: number,
  budget: VirtualViewportBudget | undefined,
): WindowLayout {
  const contentHeight = measured.reduce((total, item) => total + item.height, 0);
  const viewportBottom = scrollTop + viewportHeight;

  let visibleStartIndex = 0;
  while (
    visibleStartIndex < measured.length &&
    measured[visibleStartIndex]!.offset + measured[visibleStartIndex]!.height <= scrollTop
  ) {
    visibleStartIndex++;
  }

  let visibleEndIndex = visibleStartIndex;
  while (visibleEndIndex < measured.length && measured[visibleEndIndex]!.offset < viewportBottom) {
    visibleEndIndex++;
  }

  if (viewportHeight === 0) {
    visibleStartIndex = 0;
    visibleEndIndex = 0;
  }

  let windowStartIndex = visibleStartIndex;
  let windowEndIndex = visibleEndIndex;

  let estimatedElements = 0;
  let estimatedMeasuredWords = 0;
  for (let index = visibleStartIndex; index < visibleEndIndex; index++) {
    estimatedElements += measured[index]!.estimatedElements;
    estimatedMeasuredWords += measured[index]!.estimatedMeasuredWords;
  }

  const budgetExceeded = exceedsBudget(estimatedElements, estimatedMeasuredWords, budget);
  const overscanTop = Math.max(0, scrollTop - overscanRows);
  const overscanBottom = viewportBottom + overscanRows;

  if (!budgetExceeded) {
    while (windowStartIndex > 0) {
      const candidate = measured[windowStartIndex - 1]!;
      if (candidate.offset + candidate.height <= overscanTop) break;

      const nextElements = estimatedElements + candidate.estimatedElements;
      const nextMeasuredWords = estimatedMeasuredWords + candidate.estimatedMeasuredWords;
      if (exceedsBudget(nextElements, nextMeasuredWords, budget)) break;

      windowStartIndex--;
      estimatedElements = nextElements;
      estimatedMeasuredWords = nextMeasuredWords;
    }

    while (windowEndIndex < measured.length) {
      const candidate = measured[windowEndIndex]!;
      if (candidate.offset >= overscanBottom) break;

      const nextElements = estimatedElements + candidate.estimatedElements;
      const nextMeasuredWords = estimatedMeasuredWords + candidate.estimatedMeasuredWords;
      if (exceedsBudget(nextElements, nextMeasuredWords, budget)) break;

      windowEndIndex++;
      estimatedElements = nextElements;
      estimatedMeasuredWords = nextMeasuredWords;
    }
  }

  const beforeHeight = windowStartIndex > 0 ? measured[windowStartIndex]!.offset : 0;
  const afterHeight =
    windowEndIndex < measured.length
      ? contentHeight - measured[windowEndIndex]!.offset
      : Math.max(
          contentHeight -
            sumMeasuredRange(measured, windowStartIndex, windowEndIndex) -
            beforeHeight,
          0,
        );

  return {
    measured,
    contentHeight,
    visibleStartIndex,
    visibleEndIndex,
    windowStartIndex,
    windowEndIndex,
    beforeHeight,
    afterHeight,
    budgetExceeded,
  };
}

function sumMeasuredRange(measured: MeasuredItem[], start: number, end: number): number {
  let total = 0;
  for (let index = start; index < end; index++) {
    total += measured[index]!.height;
  }
  return total;
}

function exceedsBudget(
  estimatedElements: number,
  estimatedMeasuredWords: number,
  budget: VirtualViewportBudget | undefined,
): boolean {
  if (!budget) return false;
  if (
    budget.maxEstimatedElements !== undefined &&
    estimatedElements > budget.maxEstimatedElements
  ) {
    return true;
  }
  if (
    budget.maxEstimatedMeasuredWords !== undefined &&
    estimatedMeasuredWords > budget.maxEstimatedMeasuredWords
  ) {
    return true;
  }
  return false;
}
