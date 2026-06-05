output "auth0_domain" {
  value       = var.auth0_domain
  description = "Auth0 tenant domain"
}

output "auth0_issuer" {
  value       = local.issuer
  description = "Expected JWT iss claim (includes trailing slash per Auth0 convention)"
}

output "auth0_jwks_url" {
  value       = local.jwks_url
  description = "JWKS URL for remote_signer_webhook JWT verification"
}

output "auth0_oidc_discovery_url" {
  value       = "https://${var.auth0_domain}/.well-known/openid-configuration"
  description = "RFC 8414 OIDC discovery endpoint"
}

output "api_audience" {
  value       = auth0_resource_server.livepeer_api.identifier
  description = "JWT aud claim for Livepeer API tokens"
}

output "public_client_id" {
  value       = auth0_client.livepeer_public.client_id
  description = "Public application client ID (device flow / RFC 8628, SDK)"
}

output "m2m_client_id" {
  value       = auth0_client.livepeer_m2m.client_id
  description = "M2M application client ID (client_credentials grant)"
}

output "m2m_client_secret" {
  value       = auth0_client_credentials.livepeer_m2m_creds.client_secret
  description = "M2M application client secret"
  sensitive   = true
}

output "webhook_secret" {
  value       = local.webhook_secret
  description = "Shared secret for signer → remote_signer_webhook Authorization header"
  sensitive   = true
}

output "remote_signer_webhook_env" {
  value = <<-EOT
    JWKS_URL=${local.jwks_url}
    JWT_ISSUER=${local.issuer}
    JWT_AUDIENCE=${auth0_resource_server.livepeer_api.identifier}
    WEBHOOK_SECRET=${local.webhook_secret}
    CLAIM_CLIENT_ID=azp
    USAGE_SUBJECT_TYPE=auth0_user_id
  EOT
  description = "Environment block for go-livepeer/cmd/remote_signer_webhook"
  sensitive   = true
}

output "remote_signer_flags" {
  value = join(" ", [
    "-remoteSignerWebhookUrl http://127.0.0.1:8090/authorize",
    "-remoteSignerWebhookHeaders 'Authorization:Bearer ${local.webhook_secret}'",
  ])
  description = "go-livepeer remote signer CLI flags for the identity webhook"
  sensitive   = true
}
