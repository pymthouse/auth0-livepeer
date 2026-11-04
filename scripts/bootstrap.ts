#!/usr/bin/env node
import "./lib/env.js";
import { parseConfig, printUsage } from "./lib/config.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const config = parseConfig(argv);
  const { runBootstrap } = await import("./lib/run-bootstrap.js");
  await runBootstrap(config);
}

try {
  await main();
} catch (err) {
  console.error("[bootstrap] failed:", err);
  process.exit(1);
}
