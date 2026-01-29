CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"event_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_source_idx" ON "webhook_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_events_event_id_idx" ON "webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_source_event_idx" ON "webhook_events" USING btree ("source","event_id");
