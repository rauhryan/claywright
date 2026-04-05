import { spawn } from "bun";

const claytermDir = new URL("../packages/clayterm/", import.meta.url);
const clang = process.env.CLAYTERM_CLANG ?? "/opt/homebrew/opt/llvm/bin/clang";
const wasmLdDir = process.env.CLAYTERM_WASM_LD_DIR ?? "/opt/homebrew/bin";

async function run(cmd: string[], cwd: string) {
  const proc = spawn({
    cmd,
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(" ")}`);
  }
}

await run(["make", `CC=${clang}`, `WASM_LD_DIR=${wasmLdDir}`], claytermDir.pathname);
await run(["deno", "task", "build:npm", "0.0.0-local"], claytermDir.pathname);
