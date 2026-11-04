import { writeFile } from "node:fs/promises";
import { provisionAuth0Management } from "./auth0-management.js";
import { buildEnvFile } from "./build-env.js";
import type { BootstrapConfig } from "./config.js";
import { provisionAuth0Deploy, type Auth0ProvisionResult } from "./provision.js";
import { buildSdkConfig } from "./sdk-config.js";

async function provisionAuth0(
  config: BootstrapConfig,
): Promise<Auth0ProvisionResult> {
  if (config.auth0Mode === "management") {
    return provisionAuth0Management({
      domain: config.auth0Domain,
      mgmtClientId: config.auth0MgmtClientId,
      mgmtClientSecret: config.auth0MgmtClientSecret,
      appName: config.appName,
      apiAudience: config.apiAudience,
    });
  }

  return provisionAuth0Deploy({
    domain: config.auth0Domain,
    mgmtClientId: config.auth0MgmtClientId,
    mgmtClientSecret: config.auth0MgmtClientSecret,
    appName: config.appName,
    apiAudience: config.apiAudience,
    tenantYamlPath: config.auth0TenantYaml,
  });
}

export async function runBootstrap(config: BootstrapConfig): Promise<void> {
  let auth0: Auth0ProvisionResult | null = null;
  if (!config.skipAuth0) {
    console.log("[bootstrap] provisioning Auth0 at", config.auth0Domain);
    auth0 = await provisionAuth0(config);
  }

  if (!config.skipOpenMeter) {
    const { bootstrapOpenMeter } = await import("./openmeter.js");
    await bootstrapOpenMeter({
      baseUrl: config.openmeterUrl,
      apiKey: config.openmeterApiKey,
      trialFeatureKey: config.trialFeatureKey,
    });
  }

  const envContent = buildEnvFile(config, auth0);
  await writeFile(config.outputPath, `${envContent}\n`, "utf8");
  console.log(`[bootstrap] wrote ${config.outputPath}`);

  if (auth0) {
    const sdkConfig = buildSdkConfig(config, auth0);
    await writeFile(
      config.sdkConfigOutputPath,
      `${JSON.stringify(sdkConfig, null, 2)}\n`,
      "utf8",
    );
    console.log(`[bootstrap] wrote ${config.sdkConfigOutputPath}`);
  }
}
