import type { TextMeasureApi } from "clayterm";
import type { VirtualItem, VirtualItemMeasurement } from "./types";

interface CachedMeasurement {
  version: string | number;
  width: number;
  measurement: VirtualItemMeasurement;
}

export class MeasurementCache {
  private readonly entries = new Map<string, CachedMeasurement>();

  get(item: VirtualItem, width: number, measure: TextMeasureApi): VirtualItemMeasurement {
    const cached = this.entries.get(item.key);
    if (cached && cached.version === item.version && cached.width === width) {
      return cached.measurement;
    }

    const measurement = item.measure(width, measure);
    validateMeasurement(item.key, measurement);
    this.entries.set(item.key, { version: item.version, width, measurement });
    return measurement;
  }

  clear(): void {
    this.entries.clear();
  }
}

function validateMeasurement(key: string, measurement: VirtualItemMeasurement): void {
  if (!Number.isFinite(measurement.height) || measurement.height < 0) {
    throw new Error(`Virtual item \`${key}\` returned an invalid height (${measurement.height}).`);
  }

  if (
    measurement.estimatedElements !== undefined &&
    (!Number.isFinite(measurement.estimatedElements) || measurement.estimatedElements < 0)
  ) {
    throw new Error(
      `Virtual item \`${key}\` returned an invalid estimatedElements value (${measurement.estimatedElements}).`,
    );
  }

  if (
    measurement.estimatedMeasuredWords !== undefined &&
    (!Number.isFinite(measurement.estimatedMeasuredWords) || measurement.estimatedMeasuredWords < 0)
  ) {
    throw new Error(
      `Virtual item \`${key}\` returned an invalid estimatedMeasuredWords value (${measurement.estimatedMeasuredWords}).`,
    );
  }
}
