#!/usr/bin/env bun
import { mkdirSync } from "node:fs";

const tapes = [
  {
    id: "text-stream-scroll",
    tape: "evidence/vhs/text-stream-scroll.tape",
    output: "evidence/gifs/text-stream-scroll.gif",
  },
  {
    id: "virtual-viewport-auto-follow",
    tape: "evidence/vhs/virtual-viewport-auto-follow.tape",
    output: "evidence/gifs/virtual-viewport-auto-follow.gif",
  },
  {
    id: "virtual-viewport-budget",
    tape: "evidence/vhs/virtual-viewport-budget.tape",
    output: "evidence/gifs/virtual-viewport-budget.gif",
  },
  {
    id: "virtual-viewport-geometry",
    tape: "evidence/vhs/virtual-viewport-geometry.tape",
    output: "evidence/gifs/virtual-viewport-geometry.gif",
  },
  {
    id: "virtual-viewport-large-history",
    tape: "evidence/vhs/virtual-viewport-large-history.tape",
    output: "evidence/gifs/virtual-viewport-large-history.gif",
  },
  {
    id: "virtual-viewport-prepared-text",
    tape: "evidence/vhs/virtual-viewport-prepared-text.tape",
    output: "evidence/gifs/virtual-viewport-prepared-text.gif",
  },
  {
    id: "virtual-viewport-track",
    tape: "evidence/vhs/virtual-viewport-track.tape",
    output: "evidence/gifs/virtual-viewport-track.gif",
  },
  {
    id: "virtual-viewport-transcript-collapse",
    tape: "evidence/vhs/virtual-viewport-transcript-collapse.tape",
    output: "evidence/gifs/virtual-viewport-transcript-collapse.gif",
  },
  {
    id: "virtual-viewport-track-parity",
    tape: "evidence/vhs/virtual-viewport-track-parity.tape",
    output: "evidence/gifs/virtual-viewport-track-parity.gif",
  },
  {
    id: "buffer-workspace-focus",
    tape: "evidence/vhs/buffer-workspace-focus.tape",
    output: "evidence/gifs/buffer-workspace-focus.gif",
  },
  {
    id: "buffer-workspace-text-stream",
    tape: "evidence/vhs/buffer-workspace-text-stream.tape",
    output: "evidence/gifs/buffer-workspace-text-stream.gif",
  },
  {
    id: "claywright-agent-demo",
    tape: "evidence/vhs/claywright-agent-demo.tape",
    output: "evidence/social/agent-demo.gif",
  },
] as const;

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const checkOnly = args.includes("--check");
const requested = args.filter((arg) => !arg.startsWith("--"));
const selected = requested.length > 0 ? tapes.filter((tape) => requested.includes(tape.id)) : tapes;

if (selected.length === 0) {
  console.error("No matching tapes. Use --list to see available ids.");
  process.exit(1);
}

if (listOnly) {
  for (const tape of tapes) {
    console.log(`${tape.id}\n  tape:   ${tape.tape}\n  output: ${tape.output}`);
  }
  process.exit(0);
}

const hasVhs = Bun.spawnSync(["bash", "-lc", "command -v vhs >/dev/null 2>&1"]).exitCode === 0;
if (!hasVhs) {
  console.error(
    "vhs is not installed. Install https://github.com/charmbracelet/vhs and re-run this script.",
  );
  process.exit(1);
}

if (checkOnly) {
  console.log("vhs is installed and ready.");
  process.exit(0);
}

mkdirSync("evidence/gifs", { recursive: true });
mkdirSync("evidence/social", { recursive: true });

for (const tape of selected) {
  console.log(`Rendering ${tape.id} -> ${tape.output}`);
  const result = Bun.spawnSync(["vhs", tape.tape], {
    cwd: process.cwd(),
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    process.exit(result.exitCode ?? 1);
  }
}

console.log(`Rendered ${selected.length} tape(s).`);
