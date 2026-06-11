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
3. **Konnect Metering & Billing** — Kong Konnect (powered by OpenMeter), or legacy self-hosted / [openmeter.cloud](https://openmeter.io)

### Konnect API credentials (default)

The platform runs on [Konnect Metering & Billing API v3](https://developer.konghq.com/api/konnect/metering-and-billing/v3/). Bootstrap uses a **Konnect Personal Access Token** (`kpat_…`), not an OpenMeter Cloud `om_…` token.

1. Sign in at [cloud.konghq.com](https://cloud.konghq.com)
2. **Account** → [Personal access tokens](https://cloud.konghq.com/global/account/tokens/) → **Generate token** (Metering & Billing read/write)
3. Set in `.env`:
   - `OPENMETER_API_KEY=kpat_…`
   - `OPENMETER_URL=https://us.api.konghq.com/v3/openmeter` (pick your org region: `eu`, `au`, `sg`, etc.)

The collector and event ingest expect the `/v3/openmeter` base (events POST to `…/openmeter/events`).

### Legacy OpenMeter Cloud / self-hosted

For `openmeter.cloud` or a self-hosted OpenMeter with `/api/v1` paths, set `OPENMETER_URL` accordingly and use an `om_…` API token. Bootstrap auto-detects Kong vs legacy from the URL hostname.

### Where meters are defined

Bootstrap creates meters via the OpenMeter API. Definitions live in code:

- [`scripts/lib/meters.ts`](scripts/lib/meters.ts) — `network_fee_usd_micros`, `signed_ticket_count`
- [`scripts/lib/openmeter.ts`](scripts/lib/openmeter.ts) — creates meters + `network_spend` feature

Meter definitions live in [`scripts/lib/meters.ts`](scripts/lib/meters.ts). The **Kafka → Konnect ingest pipeline** runs on the tenant VM — see [`deploy/collector.yaml`](deploy/collector.yaml) and [`docs/clearinghouse-runtime.md`](docs/clearinghouse-runtime.md).

## Quick start (Auth0 + OpenMeter)

```bash
npm install
cp .env.example .env
# edit .env — OPENMETER_URL (Konnect region), OPENMETER_API_KEY (kpat_…), Auth0 credentials

npm run bootstrap
```

Writes `.env.livepeer` and `sdk-config.json`. CLI flags override env vars; run `npm run bootstrap -- --help` for the full list.

## Runtime stack (VM)

After bootstrap, deploy the clearinghouse runtime on a VM:

```bash
# Set REMOTE_SIGNER_WEBHOOK_URL + WEBHOOK_SECRET in .env.livepeer first
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build

# kafka + signer only:
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build kafka remote-signer

npm run stack:smoke
```

Three containers: **Kafka** (Redpanda), **go-livepeer remote signer**, **OpenMeter collector** → Konnect.

Identity webhook ships on **Vercel** with the platform app (builder-sdk), not in this compose stack.

Full operator guide: [`docs/clearinghouse-runtime.md`](docs/clearinghouse-runtime.md).

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
  "auth0": { "domain": "...", "clientId": "...", "audience": "livepeer" },
  "signer": {
    "proxyUrl": "https://your-platform.vercel.app/api/signer",
    "publicUrl": "https://signer.your-domain.com"
  },
  "remoteSigner": {
    "webhookUrl": "https://your-platform.vercel.app/webhooks/remote-signer"
  }
}
```

- `signer.proxyUrl` — Vercel BFF; forwards Auth0 JWTs to the VM signer
- `signer.publicUrl` — public HTTPS URL of the VM remote signer
- `remoteSigner.webhookUrl` — Vercel route; go-livepeer calls this on authorize

## Wiring to go-livepeer

See [go-livepeer/doc/remote-signer.md](https://github.com/livepeer/go-livepeer/blob/master/doc/remote-signer.md) and [`docs/clearinghouse-runtime.md`](docs/clearinghouse-runtime.md).

## Common options

```
--skip-openmeter                 Auth0 only (default for npm run deploy)
--skip-auth0                     OpenMeter only
--openmeter-url <url>            Konnect metering base (default: us …/v3/openmeter)
--openmeter-api-key <key>        Konnect PAT (kpat_…) or OpenMeter token (om_…)
--signer-proxy-url <url>         Vercel signer proxy BFF
--signer-public-url <url>        VM signer public HTTPS URL
--remote-signer-webhook-url <url> Vercel identity webhook URL
--sdk-config-output <path>       builder-sdk JSON (default: sdk-config.json)

docker compose -f deploy/... up  Start VM runtime (see deploy/docker-compose.yml)
npm run stack:up                 Same (npm wrapper)
npm run stack:up:core            Kafka + signer only
npm run stack:smoke              Infra smoke checks
```
