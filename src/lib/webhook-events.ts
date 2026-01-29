import { and, eq } from "drizzle-orm";

import { db, webhookEvents } from "@/db";

export async function reserveWebhookEvent(
  source: string,
  eventId: string
): Promise<boolean> {
  const [inserted] = await db
    .insert(webhookEvents)
    .values({ source, eventId })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });

  return Boolean(inserted);
}

export async function releaseWebhookEvent(source: string, eventId: string) {
  await db
    .delete(webhookEvents)
    .where(and(eq(webhookEvents.source, source), eq(webhookEvents.eventId, eventId)));
}
