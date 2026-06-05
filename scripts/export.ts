#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { dump } from "auth0-deploy-cli";
import { optionalEnv, requireEnv } from "./lib/env.js";

async function main(): Promise<void> {
  const domain = requireEnv("AUTH0_DOMAIN");
  const mgmtClientId = requireEnv("AUTH0_MGMT_CLIENT_ID");
  const mgmtClientSecret = requireEnv("AUTH0_MGMT_CLIENT_SECRET");
  const outputFolder = resolve(optionalEnv("EXPORT_OUTPUT_DIR", "./export"));

  await mkdir(outputFolder, { recursive: true });

  console.log("[auth0-livepeer] exporting tenant from", domain, "to", outputFolder);
  await dump({
    output_folder: outputFolder,
    format: "yaml",
    export_ids: true,
    config: {
      AUTH0_DOMAIN: domain,
      AUTH0_CLIENT_ID: mgmtClientId,
      AUTH0_CLIENT_SECRET: mgmtClientSecret,
    },
  });
  console.log("[auth0-livepeer] export complete");
}

main().catch((err) => {
  console.error("[auth0-livepeer] export failed:", err);
  process.exit(1);
});
