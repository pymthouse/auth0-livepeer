import type { BootstrapConfig } from "./config.js";
import type { Auth0ProvisionResult } from "./provision.js";

export type LivepeerSdkConfig = {
  auth0: {
    domain: string;
    issuer: string;
    jwksUrl: string;
    clientId: string;
    audience: string;
  };
  signer: {
    proxyUrl: string;
    audience: string;
  };
  openmeter?: {
    url: string;
    trialFeatureKey: string;
  };
  remoteSigner: {
    webhookUrl: string;
  };
};

export function buildSdkConfig(
  config: BootstrapConfig,
  auth0: Auth0ProvisionResult,
): LivepeerSdkConfig {
  const sdkConfig: LivepeerSdkConfig = {
    auth0: {
      domain: config.auth0Domain,
      issuer: auth0.issuer,
      jwksUrl: auth0.jwksUrl,
      clientId: auth0.publicClientId,
      audience: auth0.apiIdentifier,
    },
    signer: {
      proxyUrl: config.signerProxyUrl,
      audience: auth0.apiIdentifier,
    },
    remoteSigner: {
      webhookUrl: config.remoteSignerWebhookUrl,
    },
  };

  if (!config.skipOpenMeter) {
    sdkConfig.openmeter = {
      url: config.openmeterUrl.replace(/\/$/, ""),
      trialFeatureKey: config.trialFeatureKey,
    };
  }

  return sdkConfig;
}
