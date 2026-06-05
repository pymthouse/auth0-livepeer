resource "random_password" "webhook_secret" {
  count   = var.webhook_secret == "" ? 1 : 0
  length  = 32
  special = false
}

locals {
  webhook_secret = var.webhook_secret != "" ? var.webhook_secret : random_password.webhook_secret[0].result
  issuer         = "https://${var.auth0_domain}/"
  jwks_url       = "https://${var.auth0_domain}/.well-known/jwks.json"
}

resource "auth0_resource_server" "livepeer_api" {
  name                                            = "${var.app_name} Livepeer API"
  identifier                                      = var.api_audience
  signing_alg                                     = "RS256"
  token_lifetime                                  = var.token_lifetime_seconds
  token_lifetime_for_web                          = var.token_lifetime_web_seconds
  skip_consent_for_verifiable_first_party_clients = true
}

resource "auth0_resource_server_scope" "sign_job" {
  resource_server_identifier = auth0_resource_server.livepeer_api.identifier
  scope                      = "sign:job"
  description                = "Sign payment tickets for Livepeer remote signer"
}

resource "auth0_client" "livepeer_public" {
  name            = "${var.app_name} Public"
  description     = "Public client for SDK, CLI, and device authorization flow (RFC 8628)"
  app_type        = "native"
  oidc_conformant = true
  is_first_party  = true
  grant_types     = ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]

  jwt_configuration {
    alg = "RS256"
  }
}

resource "auth0_client_credentials" "livepeer_public_creds" {
  client_id             = auth0_client.livepeer_public.id
  authentication_method = "none"
}

resource "auth0_client_grant" "public_api_grant" {
  client_id = auth0_client.livepeer_public.client_id
  audience  = auth0_resource_server.livepeer_api.identifier
  scopes    = ["sign:job"]
}

resource "auth0_client" "livepeer_m2m" {
  name            = "${var.app_name} M2M"
  description     = "Confidential client for server-side Builder API and admin operations"
  app_type        = "non_interactive"
  oidc_conformant = true
  grant_types     = ["client_credentials"]
}

resource "auth0_client_credentials" "livepeer_m2m_creds" {
  client_id             = auth0_client.livepeer_m2m.id
  authentication_method = "client_secret_post"
}

resource "auth0_client_grant" "m2m_api_grant" {
  client_id = auth0_client.livepeer_m2m.client_id
  audience  = auth0_resource_server.livepeer_api.identifier
  scopes    = ["sign:job"]
}
