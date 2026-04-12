import { pgTable, text, serial, timestamp, doublePrecision, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const changeEventsTable = pgTable("change_events", {
  id: serial("id").primaryKey(),
  location: text("location").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  source: text("source").notNull(), // 'sentinel1' | 'landsat'
  eventDate: text("event_date").notNull(),
  magnitude: real("magnitude").notNull(),
  changeType: text("change_type").notNull(), // 'urban_expansion' | 'construction' | 'land_clearing' | 'infrastructure'
  areaKm2: real("area_km2").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChangeEventSchema = createInsertSchema(changeEventsTable).omit({ id: true, createdAt: true });
export type InsertChangeEvent = z.infer<typeof insertChangeEventSchema>;
export type ChangeEvent = typeof changeEventsTable.$inferSelect;
