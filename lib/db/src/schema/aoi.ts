import { pgTable, text, serial, timestamp, doublePrecision, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const areasOfInterestTable = pgTable("areas_of_interest", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minLat: doublePrecision("min_lat").notNull(),
  maxLat: doublePrecision("max_lat").notNull(),
  minLon: doublePrecision("min_lon").notNull(),
  maxLon: doublePrecision("max_lon").notNull(),
  areaKm2: real("area_km2").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAoiSchema = createInsertSchema(areasOfInterestTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAoi = z.infer<typeof insertAoiSchema>;
export type Aoi = typeof areasOfInterestTable.$inferSelect;
