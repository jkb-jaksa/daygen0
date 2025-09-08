//@ts-nocheck
// api/create-intent.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

// Create a single Stripe client instance
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) console.error("ENV MISSING: STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeKey || "");

// Map packageId
// api/create-intent.ts  (only the relevant bits)
const PRICES: Record<string, number> = {
  month: 29900, // 1 miesiąc
  threemonths: 74700, // 3 miesiące
  year: 249000, // Roczna
};

const DEFAULT_CURRENCY = "pln";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  //Temporary dev cors
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!stripeKey) {
      return res
        .status(500)
        .json({ error: "Stripe secret key not configured" });
    }

    // Body can be object or string—normalize it
    let body: any = req.body ?? {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { packageId = "warrior", customer_email } = body as {
      packageId?: string;
      customer_email?: string;
    };

    const amount = PRICES[packageId];
    if (!amount) return res.status(400).json({ error: "Invalid packageId" });

    console.log("Creating PI:", {
      packageId,
      amount,
      mode: stripeKey.startsWith("sk_live") ? "live" : "test",
    });

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: "pln",
      automatic_payment_methods: { enabled: true, allow_redirects: "always" },
      receipt_email: customer_email || undefined,
      description: `Personal Trainer - ${packageId}`,
      metadata: { project: "personal-trainer", packageId },
    });

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      clientSecret: intent.client_secret,
      amount: intent.amount,
      currency: intent.currency,
    });
  } catch (err: any) {
    console.error("create-intent error:", err?.message || err);
    return res
      .status(500)
      .json({ error: err?.message || "Unknown server error" });
  }
}
