variable "auth0_domain" {
  type        = string
  description = "Auth0 tenant domain (e.g. your-tenant.us.auth0.com)"
}

variable "auth0_mgmt_client_id" {
  type        = string
  description = "Machine-to-machine application client ID with Management API access"
  sensitive   = true
}

variable "auth0_mgmt_client_secret" {
  type        = string
  description = "Machine-to-machine application client secret"
  sensitive   = true
}

variable "app_name" {
  type        = string
  description = "Display name prefix for Livepeer platform applications"
}

variable "api_audience" {
  type        = string
  description = "API identifier (audience) for Livepeer tokens (e.g. livepeer or https://api.example.com)"
  default     = "livepeer"
}

variable "token_lifetime_seconds" {
  type        = number
  description = "Access token lifetime for the Livepeer API resource server (seconds). Default 24 h."
  default     = 86400
}

variable "token_lifetime_web_seconds" {
  type        = number
  description = "Access token lifetime for web-origin requests (seconds). Default 2 h per Auth0 recommendation."
  default     = 7200
}

variable "webhook_secret" {
  type        = string
  description = "Shared secret for remote_signer_webhook (signer -> webhook). Generated if empty."
  default     = ""
  sensitive   = true
}
