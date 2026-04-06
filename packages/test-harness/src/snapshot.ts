import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { ScreenSnapshot } from "./index";

const SNAPSHOT_DIR = "__snapshots__";

function getSnapshotPath(testFile: string, snapshotName: string): string {
  const dir = join(dirname(testFile), SNAPSHOT_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${snapshotName}.snap`);
}

export function matchSnapshot(
  snapshot: ScreenSnapshot,
  testFile: string,
  snapshotName: string,
  update: boolean = false,
): { pass: boolean; diff?: string } {
  const snapshotPath = getSnapshotPath(testFile, snapshotName);

  const expectedOutput = [
    `// ${snapshotName}`,
    `// cols: ${snapshot.cols}, rows: ${snapshot.rows}`,
    `// cursor: (${snapshot.cursorX}, ${snapshot.cursorY})`,
    "---",
    snapshot.raw,
  ].join("\n");

  if (update || !existsSync(snapshotPath)) {
    writeFileSync(snapshotPath, expectedOutput);
    return { pass: true };
  }

  const stored = readFileSync(snapshotPath, "utf-8");
  const storedLines = stored.split("\n");
  const separatorIndex = storedLines.indexOf("---");
  const storedContent = storedLines.slice(separatorIndex + 1).join("\n");

  if (storedContent === snapshot.raw) {
    return { pass: true };
  }

  const diff = createDiff(storedContent, snapshot.raw);
  return { pass: false, diff };
}

function createDiff(expected: string, actual: string): string {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const maxLines = Math.max(expectedLines.length, actualLines.length);

  const diff: string[] = ["--- Expected", "+++ Actual"];

  for (let i = 0; i < maxLines; i++) {
    const exp = expectedLines[i] ?? "";
    const act = actualLines[i] ?? "";

    if (exp !== act) {
      if (exp) diff.push(`-${exp}`);
      if (act) diff.push(`+${act}`);
    } else {
      diff.push(` ${exp}`);
    }
  }

  return diff.join("\n");
}

export function expectSnapshot(
  snapshot: ScreenSnapshot,
  testFile: string,
  snapshotName: string,
): void {
  const update = process.env.UPDATE_SNAPSHOTS === "true";
  const result = matchSnapshot(snapshot, testFile, snapshotName, update);

  if (!result.pass) {
    throw new Error(`Snapshot mismatch:\n${result.diff}`);
  }
}
