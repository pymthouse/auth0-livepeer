import { ManagementClient } from "auth0";
import type { Auth0ProvisionResult } from "./provision.js";

export async function provisionAuth0Management(opts: {
  domain: string;
  mgmtClientId: string;
  mgmtClientSecret: string;
  appName: string;
  apiAudience: string;
}): Promise<Auth0ProvisionResult> {
  const management = new ManagementClient({
    domain: opts.domain,
    clientId: opts.mgmtClientId,
    clientSecret: opts.mgmtClientSecret,
  });

  const apiResp = await management.resourceServers.create({
    name: `${opts.appName} Livepeer API`,
    identifier: opts.apiAudience,
    signing_alg: "RS256",
    token_lifetime: 86400,
    skip_consent_for_verifiable_first_party_clients: true,
    scopes: [
      {
        value: "sign:job",
        description: "Sign payment tickets for Livepeer remote signer",
      },
    ],
  });
  const api = apiResp.data;

  const publicResp = await management.clients.create({
    name: `${opts.appName} Public`,
    description: "Public client for SDK, CLI, and device authorization flow",
    app_type: "native",
    oidc_conformant: true,
    is_first_party: true,
    grant_types: [
      "urn:ietf:params:oauth:grant-type:device_code",
      "refresh_token",
    ],
    token_endpoint_auth_method: "none",
  });
  const publicClient = publicResp.data;

  const m2mResp = await management.clients.create({
    name: `${opts.appName} M2M`,
    description: "Confidential client for server-side operations",
    app_type: "non_interactive",
    oidc_conformant: true,
    grant_types: ["client_credentials"],
    token_endpoint_auth_method: "client_secret_post",
  });
  const m2mClient = m2mResp.data;

  const m2mClientId = m2mClient.client_id;
  if (!m2mClientId) {
    throw new Error("Auth0 M2M client missing client_id");
  }

  const apiIdentifier = api.identifier ?? opts.apiAudience;

  await management.clientGrants.create({
    client_id: m2mClientId,
    audience: apiIdentifier,
    scope: ["sign:job"],
  });

  await management.clientGrants.create({
    client_id: publicClient.client_id!,
    audience: apiIdentifier,
    scope: ["sign:job"],
  });

  const m2mClientSecret = m2mClient.client_secret;
  if (!m2mClientSecret) {
    throw new Error("Auth0 M2M client missing client_secret");
  }

  const publicClientId = publicClient.client_id;
  if (!publicClientId) {
    throw new Error("Auth0 public client missing client_id");
  }

  const issuer = `https://${opts.domain}/`;
  const jwksUrl = `https://${opts.domain}/.well-known/jwks.json`;

  return {
    apiIdentifier,
    publicClientId,
    m2mClientId,
    m2mClientSecret,
    jwksUrl,
    issuer,
  };
}
