/** Livepeer OpenMeter meter definitions (aligned with platform entitlements). */

export const CREATE_SIGNED_TICKET_EVENT_TYPE = "create_signed_ticket";
export const SIGNED_TICKET_EVENT_SOURCE = "go-livepeer-remote-signer";
export const NETWORK_FEE_USD_MICROS_METER = "network_fee_usd_micros";
export const SIGNED_TICKET_COUNT_METER = "signed_ticket_count";
export const DEFAULT_TRIAL_FEATURE_KEY = "network_spend";

export const OPENMETER_METER_DEFINITIONS = [
  {
    slug: NETWORK_FEE_USD_MICROS_METER,
    description:
      "Livepeer signed-ticket network fee (USD micros) — SUM of signer computed_fee_usd_micros; grouped by client, user, pipeline, model",
    eventType: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "SUM" as const,
    valueProperty: "$.network_fee_usd_micros",
    groupBy: {
      client_id: "$.client_id",
      external_user_id: "$.external_user_id",
      pipeline: "$.pipeline",
      model_id: "$.model_id",
    },
  },
  {
    slug: SIGNED_TICKET_COUNT_METER,
    description: "Signed ticket count per user",
    eventType: CREATE_SIGNED_TICKET_EVENT_TYPE,
    aggregation: "COUNT" as const,
    groupBy: {
      client_id: "$.client_id",
      external_user_id: "$.external_user_id",
      pipeline: "$.pipeline",
      model_id: "$.model_id",
    },
  },
];
