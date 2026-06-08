# Auth0 + OpenMeter Livepeer Platform Bootstrap

One-command bootstrap for **Auth0** (identity), **OpenMeter** (metering), and **builder-sdk** hosted signer configuration.

**Scripts-only — not importable as a Node library.** Run `npm run bootstrap`, `npm run deploy`, or `npm run export`; do not `import` from this package.

## What it provisions

| Component | Purpose |
|-----------|---------|
| Auth0 API (resource server) | `sign:job` scope, JWT audience for gateways |
| Auth0 public client | Device authorization flow + refresh tokens |
| Auth0 M2M client | Server-side `client_credentials` |
| OpenMeter meters | `network_fee_usd_micros`, `signed_ticket_count` |
| OpenMeter feature | `network_spend` trial entitlement |
| `.env.livepeer` | Webhook, Kafka, Collector, signer flags |
| `sdk-config.json` | builder-sdk Auth0 + signer proxy config |

Auth0 provisioning defaults to the [Auth0 Deploy CLI](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/use-as-a-node-module) using [`tenant.yaml`](tenant.yaml).

## Prerequisites

1. **Auth0 tenant** (e.g. `your-org.us.auth0.com`)
2. **Auth0 Management M2M app** — authorized for **Auth0 Management API** with scopes to manage clients, resource servers, and grants
3. **OpenMeter** — [OpenMeter Cloud](https://openmeter.io) or self-hosted (full bootstrap only)

### OpenMeter API key

1. Sign in at [openmeter.cloud](https://openmeter.cloud)
2. **API** → **Create Token** (use **Read and Write** for bootstrap)
3. Copy the token into `OPENMETER_API_KEY` in `.env`

Docs: [OpenMeter Cloud API keys](https://openmeter.io/docs/cloud/api/api-key)

`OPENMETER_URL` defaults to `https://openmeter.cloud`. Override for self-hosted (e.g. Railway).

### Where meters are defined

Bootstrap creates meters via the OpenMeter API. Definitions live in code:

- [`scripts/lib/meters.ts`](scripts/lib/meters.ts) — `network_fee_usd_micros`, `signed_ticket_count`
- [`scripts/lib/openmeter.ts`](scripts/lib/openmeter.ts) — creates meters + `network_spend` feature

There is no separate meter YAML in this repo yet. The **Kafka → OpenMeter ingest pipeline** (Wei → USD conversion) is a different concern — see [`pymthouse/config/openmeter-collector.yaml`](https://github.com/pymthouse/pymthouse/blob/main/config/openmeter-collector.yaml). That collector reads `ETH_USD_PRICE` (default `3500`); bootstrap copies it into `.env.livepeer` for convenience but you do not set it in `.env` here.

## Quick start (Auth0 + OpenMeter)

```bash
npm install
cp .env.example .env
# edit .env — OPENMETER_URL, OPENMETER_API_KEY, Auth0 credentials

npm run bootstrap
```

Writes `.env.livepeer` and `sdk-config.json`. CLI flags override env vars; run `npm run bootstrap -- --help` for the full list.

## Auth0 only

```bash
npm run deploy
```

Same Auth0 provisioning as bootstrap, skips OpenMeter (`--skip-openmeter`).

## Export (drift check)

```bash
npm run export
```

Writes `./export/tenant.yaml` from the live tenant (override with `EXPORT_OUTPUT_DIR`).

## Auth0 provision modes

| Mode | Env / flag | Description |
|------|------------|-------------|
| `deploy` (default) | `AUTH0_PROVISION_MODE=deploy` | Declarative `tenant.yaml` via Deploy CLI |
| `management` | `--auth0-mode management` | Imperative Management API (legacy) |

## tenant.yaml

| Resource | Purpose |
|----------|---------|
| Resource server `##API_AUDIENCE##` | JWT `aud` + `sign:job` scope |
| Public client | Device code + refresh token (RFC 8628) |
| M2M client | `client_credentials` |
| Client grants | Both clients → `sign:job` |

Keyword placeholders `##APP_NAME##` and `##API_AUDIENCE##` are replaced at deploy time.

## sdk-config.json

Written when Auth0 is provisioned (bootstrap or deploy):

```json
{
  "auth0": {
    "domain": "your-org.us.auth0.com",
    "clientId": "<public-client-id>",
    "audience": "livepeer"
  },
  "signer": {
    "proxyUrl": "https://api.yourplatform.com/api/signer"
  }
}
```

Map `signer.proxyUrl` to your hosted builder-sdk signer BFF; user Auth0 JWTs are forwarded to the remote signer.

## Wiring to go-livepeer

See [go-livepeer/doc/remote-signer.md](https://github.com/livepeer/go-livepeer/blob/master/doc/remote-signer.md).

```bash
export $(grep -v '^#' .env.livepeer | xargs)

pnpm --dir ../builder-sdk webhook:serve

./livepeer \
  -remoteSigner \
  -remoteSignerWebhookUrl http://127.0.0.1:8090/authorize \
  -remoteSignerWebhookHeaders "Authorization:Bearer ${WEBHOOK_SECRET}" \
  ...
```

## Common options

```
--skip-openmeter                 Auth0 only (default for npm run deploy)
--skip-auth0                     OpenMeter only
--openmeter-url <url>            OpenMeter Cloud or self-hosted base URL
--openmeter-api-key <key>        Required for OpenMeter Cloud
--signer-proxy-url <url>         Hosted builder-sdk signer proxy
--sdk-config-output <path>       builder-sdk JSON (default: sdk-config.json)
```
