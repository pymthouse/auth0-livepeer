#!/usr/bin/env node
import "./lib/env.js";
import { parseConfig, printUsage } from "./lib/config.js";
import { runBootstrap } from "./lib/run-bootstrap.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const config = parseConfig(argv);
  await runBootstrap(config);
}

main().catch((err) => {
  console.error("[bootstrap] failed:", err);
  process.exit(1);
});
