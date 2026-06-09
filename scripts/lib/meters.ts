/** Livepeer meter definitions (aligned with platform entitlements). */

export const CREATE_SIGNED_TICKET_EVENT_TYPE = "create_signed_ticket";
export const SIGNED_TICKET_EVENT_SOURCE = "go-livepeer-remote-signer";
export const NETWORK_FEE_USD_MICROS_METER = "network_fee_usd_micros";
export const SIGNED_TICKET_COUNT_METER = "signed_ticket_count";
export const DEFAULT_TRIAL_FEATURE_KEY = "network_spend";

const LIVEPEER_DIMENSIONS = {
  client_id: "$.client_id",
  external_user_id: "$.external_user_id",
  pipeline: "$.pipeline",
  model_id: "$.model_id",
} as const;

/** @openmeter/sdk (self-hosted / openmeter.cloud) meter shape. */
export const OPENMETER_METER_DEFINITIONS = [
  {
    slug: NETWORK_FEE_USD_MICROS_METER,
    description:
      "Livepeer signed-ticket network fee (USD micros) — SUM of signer computed_fee_usd_micros; grouped by client, user, pipeline, model",
    eventType: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "SUM" as const,
    valueProperty: "$.network_fee_usd_micros",
    groupBy: { ...LIVEPEER_DIMENSIONS },
  },
  {
    slug: SIGNED_TICKET_COUNT_METER,
    description: "Signed ticket count per user",
    eventType: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "COUNT" as const,
    groupBy: { ...LIVEPEER_DIMENSIONS },
  },
];

/** Konnect Metering & Billing API v3 — snake_case CreateMeterRequest bodies. */
export const KONNECT_METER_DEFINITIONS = [
  {
    key: NETWORK_FEE_USD_MICROS_METER,
    name: "Network fee (USD micros)",
    description:
      "Livepeer signed-ticket network fee (USD micros) — sum of signer computed_fee_usd_micros; grouped by client, user, pipeline, model",
    event_type: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "sum" as const,
    value_property: "$.network_fee_usd_micros",
    dimensions: { ...LIVEPEER_DIMENSIONS },
  },
  {
    key: SIGNED_TICKET_COUNT_METER,
    name: "Signed ticket count",
    description: "Signed ticket count per user",
    event_type: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "count" as const,
    dimensions: { ...LIVEPEER_DIMENSIONS },
  },
];
