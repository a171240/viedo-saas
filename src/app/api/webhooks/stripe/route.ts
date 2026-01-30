import { NextResponse, type NextRequest } from "next/server";

import { handleEvent, stripe, type Stripe } from "@/payment";
import { releaseWebhookEvent, reserveWebhookEvent } from "@/lib/webhook-events";

import { env } from "@/env.mjs";

const handler = async (req: NextRequest) => {
  const payload = await req.text();
  const signature = req.headers.get("Stripe-Signature")!;
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    ) as Stripe.Event;
    const reserved = await reserveWebhookEvent("stripe", event.id);
    if (!reserved) {
      return NextResponse.json(
        { received: true, duplicate: true },
        { status: 200 }
      );
    }

    try {
      await handleEvent(event);
    } catch (error) {
      await releaseWebhookEvent("stripe", event.id);
      throw error;
    }

    console.log("✅ Handled Stripe Event", event.type);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ Error when handling Stripe Event: ${message}`);
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

export { handler as GET, handler as POST };
