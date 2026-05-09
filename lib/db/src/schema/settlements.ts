import { pgTable, text, serial, timestamp, doublePrecision, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const informalSettlementsTable = pgTable("informal_settlements", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  minLat: doublePrecision("min_lat").notNull(),
  maxLat: doublePrecision("max_lat").notNull(),
  minLon: doublePrecision("min_lon").notNull(),
  maxLon: doublePrecision("max_lon").notNull(),
  areaKm2: real("area_km2").notNull(),
  estimatedPopulation: integer("estimated_population").notNull(),
  riskLevel: text("risk_level").notNull(),
  floodRisk: real("flood_risk").notNull(),
  heatRisk: real("heat_risk").notNull(),
  buildingHeightM: real("building_height_m"),
  densityPercent: real("density_percent"),
  detectionMethod: text("detection_method").notNull(),
  detectedAt: text("detected_at").notNull(),
  lastUpdated: text("last_updated").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettlementSchema = createInsertSchema(informalSettlementsTable).omit({ id: true, createdAt: true });
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type InformalSettlement = typeof informalSettlementsTable.$inferSelect;
