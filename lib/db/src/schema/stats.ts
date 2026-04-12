import { pgTable, text, serial, timestamp, doublePrecision, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const urbanStatsTable = pgTable("urban_stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  aoiId: integer("aoi_id"),
  urbanAreaKm2: real("urban_area_km2").notNull(),
  vegetationAreaKm2: real("vegetation_area_km2").notNull(),
  waterAreaKm2: real("water_area_km2").notNull(),
  bareLandAreaKm2: real("bare_land_area_km2").notNull(),
  growthRatePercent: real("growth_rate_percent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUrbanStatSchema = createInsertSchema(urbanStatsTable).omit({ id: true, createdAt: true });
export type InsertUrbanStat = z.infer<typeof insertUrbanStatSchema>;
export type UrbanStat = typeof urbanStatsTable.$inferSelect;
