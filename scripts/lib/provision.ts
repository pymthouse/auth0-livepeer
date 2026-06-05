import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ManagementClient } from "auth0";
import { deploy } from "auth0-deploy-cli";

export type Auth0ProvisionResult = {
  apiIdentifier: string;
  publicClientId: string;
  m2mClientId: string;
  m2mClientSecret: string;
  jwksUrl: string;
  issuer: string;
};

export type ProvisionAuth0Options = {
  domain: string;
  mgmtClientId: string;
  mgmtClientSecret: string;
  appName: string;
  apiAudience: string;
  tenantYamlPath: string;
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function defaultTenantYamlPath(): string {
  return resolve(packageRoot, "tenant.yaml");
}

function publicClientName(appName: string): string {
  return `${appName} Public`;
}

function m2mClientName(appName: string): string {
  return `${appName} M2M`;
}

async function readClientsAfterDeploy(
  opts: ProvisionAuth0Options,
): Promise<Auth0ProvisionResult> {
  const management = new ManagementClient({
    domain: opts.domain,
    clientId: opts.mgmtClientId,
    clientSecret: opts.mgmtClientSecret,
  });

  const publicName = publicClientName(opts.appName);
  const m2mName = m2mClientName(opts.appName);

  const listResp = await management.clients.getAll({
    fields: "client_id,name,client_secret",
    include_fields: true,
    page: 0,
    per_page: 100,
  });
  const clients = listResp.data ?? [];

  const publicClient = clients.find((c) => c.name === publicName);
  const m2mClient = clients.find((c) => c.name === m2mName);

  if (!publicClient?.client_id) {
    throw new Error(`Auth0 public client not found after deploy: ${publicName}`);
  }
  if (!m2mClient?.client_id) {
    throw new Error(`Auth0 M2M client not found after deploy: ${m2mName}`);
  }

  let m2mClientSecret = m2mClient.client_secret ?? "";
  if (!m2mClientSecret) {
    const credsResp = await management.clients.get({
      client_id: m2mClient.client_id,
    });
    m2mClientSecret = credsResp.data.client_secret ?? "";
  }
  if (!m2mClientSecret) {
    throw new Error(
      "Auth0 M2M client secret not returned — grant read:client_keys or read:client_credentials on the Management M2M app",
    );
  }

  const issuer = `https://${opts.domain}/`;
  const jwksUrl = `https://${opts.domain}/.well-known/jwks.json`;

  return {
    apiIdentifier: opts.apiAudience,
    publicClientId: publicClient.client_id,
    m2mClientId: m2mClient.client_id,
    m2mClientSecret,
    jwksUrl,
    issuer,
  };
}

export async function provisionAuth0Deploy(
  opts: ProvisionAuth0Options,
): Promise<Auth0ProvisionResult> {
  const tenantYamlPath = resolve(opts.tenantYamlPath);
  await readFile(tenantYamlPath, "utf8");

  await deploy({
    input_file: tenantYamlPath,
    config: {
      AUTH0_DOMAIN: opts.domain,
      AUTH0_CLIENT_ID: opts.mgmtClientId,
      AUTH0_CLIENT_SECRET: opts.mgmtClientSecret,
      AUTH0_ALLOW_DELETE: false,
      AUTH0_KEYWORD_REPLACE_MAPPINGS: {
        APP_NAME: opts.appName,
        API_AUDIENCE: opts.apiAudience,
      },
    },
  });

  return readClientsAfterDeploy(opts);
}
