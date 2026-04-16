import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCli } from "../../../../packages/bill-processing-os/src/cli.js";

export { runCli } from "../../../../packages/bill-processing-os/src/cli.js";

async function main() {
  try {
    const exitCode = await runCli(process.argv.slice(2));
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  void main();
}
