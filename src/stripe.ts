import Stripe from "stripe";
import type { Bindings } from "./types";

/**
 * Stripe on Cloudflare Workers.
 * - Uses the fetch-based HTTP client (no Node net stack at the edge).
 * - IMPORTANT: verify webhooks with `constructEventAsync`, NOT the sync
 *   `constructEvent`, or you'll get "SubtleCryptoProvider cannot be used in a
 *   synchronous context."
 */
export function getStripe(env: Bindings): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
