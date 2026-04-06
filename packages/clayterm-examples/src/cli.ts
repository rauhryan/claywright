import { examples, type ExampleName } from "./index";

const arg = process.argv[2];
const name = arg === "list" ? arg : (arg as ExampleName | undefined);
const available = Object.keys(examples).join("\n  - ");

if (!name || name === "list") {
  console.log(`Available examples:\n  - ${available}`);
  process.exit(0);
}

if (!(name in examples)) {
  console.error(`Unknown example: ${name}\n\nAvailable examples:\n  - ${available}`);
  process.exit(1);
}

await import(examples[name]);
