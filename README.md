# Auth0 Livepeer Platform

Declarative Auth0 provisioning for the Livepeer remote signer identity webhook.

**Scripts-only — not importable as a Node library.** Run `npm run deploy` or `npm run export`; do not `import` from this package.

Provisions: `livepeer` API (`sign:job`), public device-flow client, M2M client, and client grants via `tenant.yaml` and the [Auth0 Deploy CLI](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/use-as-a-node-module).

## Prerequisites

1. Auth0 tenant (e.g. `your-org.us.auth0.com`)
2. Management M2M app authorized for **Auth0 Management API** with `read/create/update` scopes for clients, resource servers, and client grants

## Deploy

```bash
npm install
cp .env.example .env
# edit .env — variables load automatically

npm run deploy
```

Writes `.env.livepeer` with webhook + client credentials. See [`.env.example`](.env.example) for all variables.

## Export (drift check)

```bash
npm run export
```

Writes `./export/tenant.yaml` from the live tenant (override with `EXPORT_OUTPUT_DIR`).

## tenant.yaml

| Resource | Purpose |
|----------|---------|
| Resource server `##API_AUDIENCE##` | JWT `aud` + `sign:job` scope |
| Public client | Device code + refresh token (RFC 8628) |
| M2M client | `client_credentials` |
| Client grants | Both clients → `sign:job` |

Keyword placeholders `##APP_NAME##` and `##API_AUDIENCE##` are replaced at deploy time.

## Wiring to go-livepeer

See [go-livepeer/doc/remote-signer.md](https://github.com/livepeer/go-livepeer/blob/master/doc/remote-signer.md).

```bash
# after deploy — load generated output for webhook/signer processes
export $(grep -v '^#' .env.livepeer | xargs)

go run ./cmd/remote_signer_webhook -addr :8090

./livepeer \
  -remoteSigner \
  -remoteSignerWebhookUrl http://127.0.0.1:8090/authorize \
  -remoteSignerWebhookHeaders "Authorization:Bearer ${WEBHOOK_SECRET}" \
  ...
```
