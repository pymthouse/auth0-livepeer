import { randomBytes } from "node:crypto";
import {
  DEFAULT_KONNECT_METERING_URL,
  isKonnectMeteringUrl,
  normalizeKonnectMeteringUrl,
} from "./konnect-metering.js";
import { defaultTenantYamlPath } from "./provision.js";

export type Auth0ProvisionMode = "deploy" | "management";

export type BootstrapConfig = {
  auth0Domain: string;
  auth0MgmtClientId: string;
  auth0MgmtClientSecret: string;
  auth0Mode: Auth0ProvisionMode;
  auth0TenantYaml: string;
  appName: string;
  apiAudience: string;
  openmeterUrl: string;
  openmeterApiKey: string | undefined;
  trialFeatureKey: string;
  webhookSecret: string;
  signerProxyUrl: string;
  signerPublicUrl: string;
  remoteSignerWebhookUrl: string;
  signerNetwork: string;
  ethRpcUrl: string;
  signerEthAddr: string;
  kafkaBrokers: string;
  kafkaGatewayTopic: string;
  ethUsdPrice: string;
  outputPath: string;
  sdkConfigOutputPath: string;
  skipAuth0: boolean;
  skipOpenMeter: boolean;
};

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i === -1 || i + 1 >= argv.length) {
    return undefined;
  }
  return argv[i + 1];
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function parseConfig(argv: string[]): BootstrapConfig {
  const auth0Domain =
    argValue(argv, "--auth0-domain") ?? env("AUTH0_DOMAIN") ?? "";
  const auth0MgmtClientId =
    argValue(argv, "--auth0-mgmt-client-id") ?? env("AUTH0_MGMT_CLIENT_ID") ?? "";
  const auth0MgmtClientSecret =
    argValue(argv, "--auth0-mgmt-client-secret") ??
    env("AUTH0_MGMT_CLIENT_SECRET") ??
    "";
  const appName = argValue(argv, "--app-name") ?? env("APP_NAME") ?? "Livepeer Platform";
  const apiAudience =
    argValue(argv, "--api-audience") ?? env("AUTH0_AUDIENCE") ?? "livepeer";
  const openmeterApiKey =
    argValue(argv, "--openmeter-api-key") ?? env("OPENMETER_API_KEY");
  const openmeterUrlRaw =
    argValue(argv, "--openmeter-url") ??
    env("OPENMETER_URL") ??
    DEFAULT_KONNECT_METERING_URL;
  const openmeterUrl = isKonnectMeteringUrl(openmeterUrlRaw, openmeterApiKey)
    ? normalizeKonnectMeteringUrl(
        /konghq\.com/i.test(openmeterUrlRaw)
          ? openmeterUrlRaw
          : DEFAULT_KONNECT_METERING_URL,
      )
    : openmeterUrlRaw.replace(/\/$/, "");
  const trialFeatureKey =
    argValue(argv, "--trial-feature-key") ??
    env("OPENMETER_TRIAL_FEATURE_KEY") ??
    "network_spend";
  const webhookSecret =
    argValue(argv, "--webhook-secret") ??
    env("WEBHOOK_SECRET") ??
    randomBytes(24).toString("hex");
  const kafkaBrokers =
    argValue(argv, "--kafka-brokers") ?? env("KAFKA_BROKERS") ?? "kafka:9092";
  const kafkaGatewayTopic =
    argValue(argv, "--kafka-gateway-topic") ??
    env("KAFKA_GATEWAY_TOPIC") ??
    "livepeer-gateway-events";
  const ethUsdPrice =
    argValue(argv, "--eth-usd-price") ?? env("ETH_USD_PRICE") ?? "3500";
  const outputPath =
    argValue(argv, "--output") ?? env("BOOTSTRAP_OUTPUT") ?? ".env.livepeer";
  const sdkConfigOutputPath =
    argValue(argv, "--sdk-config-output") ??
    env("SDK_CONFIG_OUTPUT") ??
    "sdk-config.json";
  const auth0ModeRaw =
    argValue(argv, "--auth0-mode") ?? env("AUTH0_PROVISION_MODE") ?? "deploy";
  if (auth0ModeRaw !== "deploy" && auth0ModeRaw !== "management") {
    throw new Error('--auth0-mode must be "deploy" or "management"');
  }
  const auth0Mode = auth0ModeRaw as Auth0ProvisionMode;
  const auth0TenantYaml =
    argValue(argv, "--auth0-tenant-yaml") ??
    env("AUTH0_TENANT_YAML") ??
    defaultTenantYamlPath();
  const signerProxyUrl =
    argValue(argv, "--signer-proxy-url") ??
    env("SIGNER_PROXY_URL") ??
    "https://your-platform.vercel.app/api/signer";
  const signerPublicUrl =
    argValue(argv, "--signer-public-url") ??
    env("SIGNER_PUBLIC_URL") ??
    "https://signer.your-domain.com";
  const remoteSignerWebhookUrl =
    argValue(argv, "--remote-signer-webhook-url") ??
    env("REMOTE_SIGNER_WEBHOOK_URL") ??
    "https://your-platform.vercel.app/webhooks/remote-signer";
  const signerNetwork =
    argValue(argv, "--signer-network") ??
    env("SIGNER_NETWORK") ??
    "arbitrum-one-mainnet";
  const ethRpcUrl =
    argValue(argv, "--eth-rpc-url") ?? env("ETH_RPC_URL") ?? "https://arb1.arbitrum.io/rpc";
  const signerEthAddr =
    argValue(argv, "--signer-eth-addr") ?? env("SIGNER_ETH_ADDR") ?? "";

  const skipAuth0 = hasFlag(argv, "--skip-auth0");
  const skipOpenMeter = hasFlag(argv, "--skip-openmeter");

  if (!skipAuth0) {
    if (!auth0Domain) {
      throw new Error("Missing --auth0-domain or AUTH0_DOMAIN");
    }
    if (!auth0MgmtClientId || !auth0MgmtClientSecret) {
      throw new Error(
        "Missing Auth0 Management API credentials (--auth0-mgmt-client-id / AUTH0_MGMT_CLIENT_ID)",
      );
    }
  }

  if (!skipOpenMeter && !openmeterUrl) {
    throw new Error("Missing --openmeter-url or OPENMETER_URL");
  }

  if (!skipOpenMeter && !openmeterApiKey) {
    throw new Error(
      "Missing OPENMETER_API_KEY — Konnect PAT (kpat_…) for Kong, or OpenMeter token (om_…) for openmeter.cloud",
    );
  }

  return {
    auth0Domain,
    auth0MgmtClientId,
    auth0MgmtClientSecret,
    auth0Mode,
    auth0TenantYaml,
    appName,
    apiAudience,
    openmeterUrl,
    openmeterApiKey,
    trialFeatureKey,
    webhookSecret,
    signerProxyUrl,
    signerPublicUrl,
    remoteSignerWebhookUrl,
    signerNetwork,
    ethRpcUrl,
    signerEthAddr,
    kafkaBrokers,
    kafkaGatewayTopic,
    ethUsdPrice,
    outputPath,
    sdkConfigOutputPath,
    skipAuth0,
    skipOpenMeter,
  };
}

export function printUsage(): void {
  console.log(`Usage: npm run bootstrap -- [options]

Options:
  --auth0-domain <domain>           Auth0 tenant domain
  --auth0-mgmt-client-id <id>       Auth0 Management M2M client ID
  --auth0-mgmt-client-secret <sec>  Auth0 Management M2M client secret
  --auth0-mode <deploy|management>  Auth0 provision path (default: deploy)
  --auth0-tenant-yaml <path>        tenant.yaml for deploy mode (default: ./tenant.yaml)
  --app-name <name>                 Application display name prefix
  --api-audience <aud>              API identifier (default: livepeer)
  --openmeter-url <url>             Konnect metering base (default: us.api.konghq.com/v3/openmeter)
  --openmeter-api-key <key>         Konnect PAT (kpat_…) or OpenMeter token (om_…)
  --trial-feature-key <key>         Entitlement feature key (default: network_spend)
  --webhook-secret <secret>         Shared secret for remote_signer_webhook
  --signer-proxy-url <url>          Vercel signer proxy BFF URL
  --signer-public-url <url>         Public HTTPS URL of VM remote signer
  --remote-signer-webhook-url <url> Vercel identity webhook (go-livepeer calls this)
  --signer-network <network>        go-livepeer -network (default: arbitrum-one-mainnet)
  --eth-rpc-url <url>               Ethereum RPC for remote signer
  --signer-eth-addr <addr>          Funded signer ETH address (operator)
  --sdk-config-output <path>        Write builder-sdk config JSON (default: sdk-config.json)
  --kafka-brokers <addrs>           Kafka bootstrap servers
  --kafka-gateway-topic <topic>       go-livepeer monitor topic
  --eth-usd-price <price>           ETH/USD for Collector Wei conversion
  --output <path>                   Write combined .env file (default: .env.livepeer)
  --skip-auth0                      Only bootstrap OpenMeter
  --skip-openmeter                  Only provision Auth0 (same as npm run deploy)
  --help                            Show this help
`);
}
