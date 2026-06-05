# Auth0 Livepeer Platform

Declarative Auth0 provisioning for the Livepeer remote signer identity webhook.

**This repo is scripts-only — not importable as a Node library.** Run `npm run deploy` or `npm run export`; do not `import` from this package.

| Path | When to use |
|------|-------------|
| **Node scripts** (default) | `tenant.yaml` + `npm run deploy`; portable across OS, no shell |
| **Terraform** | Ops teams with existing IaC workflows |

Both provision the same resources: `livepeer` API (`sign:job`), public device-flow client, M2M client, and client grants.

## Node quick start (recommended)

### Prerequisites

1. Auth0 tenant (e.g. `your-org.us.auth0.com`)
2. Management M2M app authorized for **Auth0 Management API** with `read/create/update` scopes for clients, resource servers, and client grants

### Deploy

```bash
cd auth0-livepeer
npm install
cp .env.example .env
# edit .env with your Management M2M credentials

npm run deploy
```

See [`.env.example`](.env.example) for all supported variables.

Writes `.env.livepeer` with webhook + client credentials.

### Export (drift check)

```bash
npm run export
# writes ./export/tenant.yaml from live tenant (override with EXPORT_OUTPUT_DIR)
```

Scripts use [Auth0 Deploy CLI](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/use-as-a-node-module) `deploy()` / `dump()` with keyword replacement in `tenant.yaml`. Internal helpers live under `scripts/lib/` and are not published.

## Full platform bootstrap (Auth0 + OpenMeter + sdk-config)

From the pymthouse monorepo:

```bash
cd pymthouse/packages/livepeer-platform-bootstrap
npm install
npm run dev -- \
  --auth0-domain your-org.us.auth0.com \
  --auth0-mgmt-client-id ... \
  --auth0-mgmt-client-secret ... \
  --openmeter-url https://openmeter.cloud \
  --openmeter-api-key om_xxx \
  --signer-proxy-url https://api.yourplatform.com/api/signer \
  --output ../../.env.livepeer \
  --sdk-config-output ../../sdk-config.json
```

Outputs:

- `.env.livepeer` — signer, webhook, collector env
- `sdk-config.json` — drop-in config for builder-sdk hosted signer proxy

Use `--auth0-mode management` to use the Management API instead of Deploy CLI.

## Terraform

```bash
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
terraform output -raw remote_signer_webhook_env > .env.livepeer
```

## tenant.yaml resources

- **Resource server** `##API_AUDIENCE##` with `sign:job` scope
- **Public client** — device code + refresh token (RFC 8628)
- **M2M client** — `client_credentials`
- **Client grants** for both clients

Keyword placeholders `##APP_NAME##` and `##API_AUDIENCE##` are replaced at deploy time.

## Wiring to go-livepeer

See [go-livepeer/doc/remote-signer.md](https://github.com/livepeer/go-livepeer/blob/master/doc/remote-signer.md).

```bash
source .env.livepeer
go run ./cmd/remote_signer_webhook -addr :8090

./livepeer \
  -remoteSigner \
  -remoteSignerWebhookUrl http://127.0.0.1:8090/authorize \
  -remoteSignerWebhookHeaders "Authorization:Bearer ${WEBHOOK_SECRET}" \
  ...
```

## sdk-config.json shape

```json
{
  "auth0": {
    "domain": "your-org.us.auth0.com",
    "issuer": "https://your-org.us.auth0.com/",
    "jwksUrl": "https://your-org.us.auth0.com/.well-known/jwks.json",
    "clientId": "<public-client-id>",
    "audience": "livepeer"
  },
  "signer": {
    "proxyUrl": "https://api.yourplatform.com/api/signer",
    "audience": "livepeer"
  },
  "openmeter": {
    "url": "https://openmeter.cloud",
    "trialFeatureKey": "network_spend"
  },
  "remoteSigner": {
    "webhookUrl": "http://127.0.0.1:8090/authorize"
  }
}
```

Point builder-sdk gateway / device exchange at `signer.proxyUrl`; end-user Auth0 JWTs are forwarded to the hosted remote signer per [builder-sdk proxy](https://github.com/pymthouse/builder-sdk/blob/main/src/signer/proxy.ts).
