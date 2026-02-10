import crypto from "node:crypto";
import path from "node:path";
import dotenv from "dotenv";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";

dotenv.config({
  path: [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.local")],
  override: true,
  quiet: true,
});

type ApiResponse<T> =
  | { received: true; duplicate?: boolean }
  | { error: string };

function uniq(items: Array<string | undefined | null>) {
  return [...new Set(items.filter(Boolean))] as string[];
}

async function resolveBaseURL() {
  const candidates = uniq([
    process.env.BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://127.0.0.1:3002",
    "http://localhost:3002",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
  ]);

  const probes = ["/en", "/"];
  for (const baseURL of candidates) {
    for (const probe of probes) {
      try {
        const resp = await fetch(`${baseURL}${probe}`, { redirect: "manual" });
        const status = resp.status;
        if (status && status !== 404) return baseURL;
      } catch {
        // ignore connection errors
      }
    }
  }

  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<{ status: number; json: T }> {
  const resp = await fetch(url, init);
  const json = (await resp.json()) as T;
  return { status: resp.status, json };
}

async function main() {
  const baseURL = await resolveBaseURL();

  const stripeSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_API_KEY;
  assert(stripeSecret, "Missing STRIPE_WEBHOOK_SECRET in env");
  assert(stripeKey, "Missing STRIPE_API_KEY in env");

  const stripe = new Stripe(stripeKey);
  const { db, webhookEvents } = await import("../src/db");

  const eventId = `evt_smoke_${crypto.randomUUID()}`;
  const payload = JSON.stringify({
    id: eventId,
    object: "event",
    api_version: "2024-10-28",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: `cs_smoke_${crypto.randomUUID()}`,
        object: "checkout.session",
      },
    },
  });

  // Pre-reserve this event so the webhook handler returns early without calling Stripe API.
  await db
    .insert(webhookEvents)
    .values({ source: "stripe", eventId })
    .onConflictDoNothing();

  try {
    const signatureHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: stripeSecret,
    });

    const url = `${baseURL}/api/webhooks/stripe`;

    // Valid signature + duplicate gate => 200 (no Stripe API calls).
    {
      const { status, json } = await fetchJson<ApiResponse<{ received: true; duplicate?: boolean }>>(url, {
        method: "POST",
        headers: {
          "Stripe-Signature": signatureHeader,
          "content-type": "application/json",
        },
        body: payload,
      });
      assert(status === 200, `Expected stripe webhook to return 200 but got ${status}`);
      assert((json as any).received === true, "Expected received=true");
      assert((json as any).duplicate === true, "Expected duplicate=true for pre-reserved event");
      console.log("P0-10 ok: stripe webhook signature + idempotency gate");
    }

    // Invalid signature => 400
    {
      const { status } = await fetchJson<ApiResponse<unknown>>(url, {
        method: "POST",
        headers: {
          "Stripe-Signature": "t=0,v1=invalid",
          "content-type": "application/json",
        },
        body: payload,
      });
      assert(status === 400, `Expected stripe webhook invalid signature to return 400 but got ${status}`);
      console.log("P0-10 ok: stripe webhook invalid signature rejected");
    }
  } finally {
    await db.delete(webhookEvents).where(and(eq(webhookEvents.source, "stripe"), eq(webhookEvents.eventId, eventId)));
  }

  console.log("P0-10 stripe webhook gate smoke all ok");
  // Drizzle/postgres keeps a pool open; exit explicitly for CLI smoke scripts.
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

