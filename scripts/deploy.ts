#!/usr/bin/env node
import "./lib/env.js";
import { parseConfig } from "./lib/config.js";

async function main(): Promise<void> {
  const argv = [...process.argv.slice(2), "--skip-openmeter"];
  const config = parseConfig(argv);
  const { runBootstrap } = await import("./lib/run-bootstrap.js");
  await runBootstrap(config);
}

try {
  await main();
} catch (err) {
  console.error("[auth0-livepeer] deploy failed:", err);
  process.exit(1);
}
