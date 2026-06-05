# Auth0 Livepeer Platform — Terraform

Provisions Auth0 resources for the Livepeer remote signer identity webhook ([go-livepeer PR #3897](https://github.com/livepeer/go-livepeer/pull/3897)).

| Resource | Purpose |
|----------|---------|
| `auth0_resource_server` | API / audience for JWT `aud` claim; `RS256`; `sign:job` scope |
| `auth0_client` (public) | Native client for device authorization flow ([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) |
| `auth0_client_credentials` (public) | Public client auth method (`none`) |
| `auth0_client` (M2M) | `client_credentials` for server-side admin |
| `auth0_client_credentials` (M2M) | M2M auth method (`client_secret_post`) |
| `auth0_client_grant` × 2 | Authorize both clients for `sign:job` |
| `random_password` | Auto-generates webhook shared secret if not provided |

Compatible with **Auth0 Terraform provider v1.48+** (scopes and client credentials are separate resources).

## Prerequisites

### 1. Auth0 tenant

Create a tenant at [auth0.com](https://auth0.com). Domain is typically `your-org.us.auth0.com`.

### 2. Terraform Management M2M application

Create once in the Auth0 dashboard:

1. **Applications** → **Create Application** → **Machine to Machine**
2. Authorize **Auth0 Management API** with scopes:

```
read:clients          create:clients          update:clients
read:resource_servers create:resource_servers update:resource_servers
read:client_grants    create:client_grants
```

3. Copy **Client ID** and **Client Secret** → `auth0_mgmt_client_id` / `auth0_mgmt_client_secret`.

### 3. Terraform CLI

```bash
# Linux (HashiCorp apt repo)
sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# macOS
brew install terraform
```

## Usage

```bash
git clone git@github.com:pymthouse/auth0-livepeer.git
cd auth0-livepeer

cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your tenant domain and Management M2M credentials

terraform init
terraform plan
terraform apply
```

Or pass secrets via environment variables:

```bash
export TF_VAR_auth0_domain="your-org.us.auth0.com"
export TF_VAR_auth0_mgmt_client_id="<id>"
export TF_VAR_auth0_mgmt_client_secret="<secret>"
terraform apply -var="app_name=My Livepeer Platform"
```

### Capture outputs

```bash
terraform output -raw remote_signer_webhook_env > .env.livepeer
terraform output -raw public_client_id
terraform output -raw m2m_client_id
terraform output -raw m2m_client_secret
terraform output -raw remote_signer_flags
```

## Variable reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `auth0_domain` | yes | — | Auth0 tenant domain |
| `auth0_mgmt_client_id` | yes | — | Management M2M client ID |
| `auth0_mgmt_client_secret` | yes | — | Management M2M client secret |
| `app_name` | yes | — | Display name prefix for created resources |
| `api_audience` | no | `livepeer` | JWT `aud` claim / API identifier |
| `token_lifetime_seconds` | no | `86400` | Access token TTL (24 h) |
| `token_lifetime_web_seconds` | no | `7200` | Web-origin token TTL (2 h) |
| `webhook_secret` | no | auto-generated | Signer → webhook shared secret |

## Wiring to go-livepeer

```bash
# Identity webhook sidecar (from go-livepeer repo)
source .env.livepeer
go run ./cmd/remote_signer_webhook -addr :8090

# Remote signer
./livepeer \
  -remoteSigner \
  -remoteSignerWebhookUrl http://127.0.0.1:8090/authorize \
  -remoteSignerWebhookHeaders "Authorization:Bearer ${WEBHOOK_SECRET}" \
  ...
```

See [go-livepeer/doc/remote-signer.md](https://github.com/livepeer/go-livepeer/blob/master/doc/remote-signer.md) for full remote signer documentation.

## Pair with OpenMeter

Auth0 provisioning is identity only. Metering uses Kafka + OpenMeter Collector. Bootstrap OpenMeter from the [pymthouse](https://github.com/pymthouse/pymthouse) monorepo:

```bash
OPENMETER_URL=https://openmeter.cloud OPENMETER_API_KEY=om_xxx npm run openmeter:bootstrap
```

Or use `packages/livepeer-platform-bootstrap` for Auth0 + OpenMeter in one CLI command.

## Destroy

```bash
terraform destroy -var="app_name=My Livepeer Platform"
```

The manually created Terraform Management M2M app is not managed by this module.
