# Clearinghouse Runtime (single tenant)

Operator guide for the **VM runtime stack** after control-plane bootstrap. Identity webhook and platform UI deploy separately on **Vercel** via builder-sdk.

## Architecture

| Component | Host | Repo / package |
|-----------|------|----------------|
| Auth0 | SaaS | auth0-livepeer bootstrap |
| Konnect Metering & Billing | SaaS | auth0-livepeer bootstrap |
| Platform app + identity webhook | Vercel | builder-sdk (`@pymthouse/builder-sdk/signer/webhook`) |
| Kafka + remote signer + collector | Tenant VM | auth0-livepeer `deploy/` |

```text
Scope/CLI ──JWT──► Vercel signer proxy ──► VM remote signer
                         │                        │
                         │                        ├──POST──► Vercel /webhooks/remote-signer
                         │                        └──Kafka──► collector ──► Konnect
```

## Deploy order

1. **Bootstrap** (workstation)

   ```bash
   npm install
   cp .env.example .env
   # Auth0 + Konnect credentials
   npm run bootstrap
   ```

   Outputs `.env.livepeer` and `sdk-config.json`.

2. **Vercel platform** (webhook + signer proxy)

   Deploy your platform app with routes:

   | Route | Purpose |
   |-------|---------|
   | `POST /webhooks/remote-signer` | `createRemoteSignerAuthorizeHandler` — go-livepeer `-remoteSignerWebhookUrl` |
   | `/api/signer/*` | Signer proxy — forwards Auth0 JWT to `SIGNER_PUBLIC_URL` |

   Env from bootstrap (Vercel project settings):

   ```env
   JWT_ISSUER=...
   JWT_AUDIENCE=...
   WEBHOOK_SECRET=...
   CLAIM_CLIENT_ID=azp
   USAGE_SUBJECT_TYPE=auth0_user_id
   SIGNER_PUBLIC_URL=https://signer.your-domain.com
   ```

   See [builder-sdk README](https://github.com/pymthouse/builder-sdk) — Remote signer identity webhook.

3. **Update `.env.livepeer`** with live Vercel URLs:

   ```env
   REMOTE_SIGNER_WEBHOOK_URL=https://your-app.vercel.app/webhooks/remote-signer
   SIGNER_PROXY_URL=https://your-app.vercel.app/api/signer
   SIGNER_PUBLIC_URL=https://signer.your-domain.com
   SIGNER_ETH_ADDR=0x...   # funded signer wallet
   ```

4. **VM stack**

   ```bash
   # full stack (kafka + signer + collector)
   docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build

   # kafka + signer only (local dev)
   docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build kafka remote-signer

   npm run stack:smoke
   ```

   npm shortcuts: `stack:up` (full), `stack:up:core` (kafka + signer).

   Or Ansible:

   ```bash
   CLEARINGHOUSE_HOST=1.2.3.4 ansible-playbook -i ansible/inventory/single.yml ansible/playbook.yml
   ```

## Env split

| Variable | VM | Vercel |
|----------|:--:|:------:|
| `OPENMETER_URL`, `OPENMETER_API_KEY` | collector | optional query BFF |
| `KAFKA_BROKERS`, `KAFKA_GATEWAY_TOPIC` | signer, collector | — |
| `WEBHOOK_SECRET` | signer → webhook auth | webhook route |
| `JWT_ISSUER`, `JWT_AUDIENCE` | — | webhook route |
| `REMOTE_SIGNER_WEBHOOK_URL` | signer `-remoteSignerWebhookUrl` | route URL |
| `SIGNER_PUBLIC_URL` | publish signer TLS URL | proxy upstream |
| `SIGNER_PROXY_URL` | — | client-facing BFF |
| `SIGNER_ETH_ADDR`, `ETH_RPC_URL` | signer | — |
| `sdk-config.json` | reference | platform config |

## docker compose services

| Service | Image / build | Ports |
|---------|---------------|-------|
| `kafka` | Redpanda | internal `9092` |
| `remote-signer` | `deploy/signer/Dockerfile` (`livepeer/go-livepeer:latest`) | `8081` (override `SIGNER_HOST_PORT`) |
| `openmeter-collector` | [`ghcr.io/openmeterio/benthos-collector`](https://github.com/openmeterio/openmeter/pkgs/container/benthos-collector) (`-c /config.yaml`) | none |

The signer image copies `livepeer` from `livepeer/go-livepeer:latest` and always enables webhook identity (`-remoteSignerWebhookUrl`) and Kafka monitor flags. Requires `REMOTE_SIGNER_WEBHOOK_URL` and `WEBHOOK_SECRET` in `.env.livepeer`.

## Verification

**VM smoke** (no funded sign):

```bash
npm run stack:smoke
```

**Full E2E** (manual):

1. Device auth on Vercel platform → Auth0 JWT
2. Scope calls signer proxy → remote signer signs
3. Konnect dashboard → meters show `create_signed_ticket` usage

## TLS for signer

Expose `SIGNER_PUBLIC_URL` via reverse proxy (Caddy/nginx) terminating TLS on the VM. The platform proxy must reach the signer over HTTPS in production.

## Commands

```bash
# docker compose (canonical)
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer up -d --build kafka remote-signer
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer down
docker compose -f deploy/docker-compose.yml --env-file .env.livepeer logs -f remote-signer

# npm wrappers (print the docker command, then run it)
npm run stack:up
npm run stack:up:core   # kafka + remote-signer only
npm run stack:down
npm run stack:logs
npm run stack:smoke
```

**Local webhook:** run `pnpm webhook:serve` in builder-sdk, then set
`REMOTE_SIGNER_WEBHOOK_URL=http://host.docker.internal:8090/authorize` in `.env.livepeer`.
The signer service includes `extra_hosts` for `host.docker.internal` on Linux.
