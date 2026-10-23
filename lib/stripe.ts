import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || "dummy_sk_test_key_for_build";
  return new Stripe(key);
}

const stripe = new Proxy({} as Stripe, {
  get(_target, prop: keyof Stripe) {
    const instance = getStripe();
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export default stripe;

/**
 * Flat-rate shipping calculator (placeholder until Shippo/EasyPost)
 * Free for orders >= $50, otherwise $5.99
 */
export function calculateShipping(subtotal: number): number {
  return subtotal >= 50 ? 0 : 5.99;
}

/**
 * Generate a human-readable order number
 * Format: XP-YYYY-XXXXX (e.g. XP-2025-00001)
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { default: Order } = await import("@/models/Order");
  const count = await Order.countDocuments();
  const seq = String(count + 1).padStart(5, "0");
  return `PG-${year}-${seq}`;
}
