#!/usr/bin/env node
import "./lib/env.js";
import { parseConfig } from "./lib/config.js";
import { runBootstrap } from "./lib/run-bootstrap.js";

async function main(): Promise<void> {
  const argv = [...process.argv.slice(2), "--skip-openmeter"];
  const config = parseConfig(argv);
  await runBootstrap(config);
}

main().catch((err) => {
  console.error("[auth0-livepeer] deploy failed:", err);
  process.exit(1);
});
