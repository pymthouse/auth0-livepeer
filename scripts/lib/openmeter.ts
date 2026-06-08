import { OpenMeter } from "@openmeter/sdk";
import {
  DEFAULT_TRIAL_FEATURE_KEY,
  OPENMETER_METER_DEFINITIONS,
} from "./meters.js";

async function waitForHealthy(baseUrl: string, attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/debug/metrics`);
      if (resp.ok) {
        return;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`OpenMeter not healthy at ${baseUrl}`);
}

export async function bootstrapOpenMeter(opts: {
  baseUrl: string;
  apiKey?: string;
  trialFeatureKey?: string;
}): Promise<void> {
  const baseUrl = opts.baseUrl.replace(/\/$/, "");
  await waitForHealthy(baseUrl);

  const client = opts.apiKey?.trim()
    ? new OpenMeter({ baseUrl, apiKey: opts.apiKey.trim() })
    : new OpenMeter({ baseUrl });

  const existing = await client.meters.list();

  for (const meter of OPENMETER_METER_DEFINITIONS) {
    const existingMeter = (existing || []).find((m) => m.slug === meter.slug);
    if (existingMeter) {
      const groupBy = existingMeter.groupBy ?? {};
      const hasPipelineGroupBy =
        "pipeline" in groupBy && "model_id" in groupBy;
      if (!hasPipelineGroupBy) {
        console.warn(
          `[openmeter] meter ${meter.slug} missing pipeline/model_id groupBy — recreate manually if needed`,
        );
      }
      continue;
    }
    await client.meters.create(meter);
  }

  const featureKey = opts.trialFeatureKey?.trim() || DEFAULT_TRIAL_FEATURE_KEY;
  try {
    const features = await client.features.list();
    const hasFeature = (features || []).some((f) => f.key === featureKey);
    if (!hasFeature) {
      await client.features.create({
        key: featureKey,
        name: "Network spend",
        meterSlug: "network_fee_usd_micros",
      });
    }
  } catch (err) {
    console.warn("[openmeter] feature bootstrap skipped:", err);
  }
}
