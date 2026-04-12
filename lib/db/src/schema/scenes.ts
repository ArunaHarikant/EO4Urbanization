import { pgTable, text, serial, timestamp, doublePrecision, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const satelliteScenesTable = pgTable("satellite_scenes", {
  id: serial("id").primaryKey(),
  sceneId: text("scene_id").notNull(),
  source: text("source").notNull(), // 'sentinel1' | 'landsat'
  acquisitionDate: text("acquisition_date").notNull(),
  cloudCoverPercent: real("cloud_cover_percent"),
  minLat: doublePrecision("min_lat").notNull(),
  maxLat: doublePrecision("max_lat").notNull(),
  minLon: doublePrecision("min_lon").notNull(),
  maxLon: doublePrecision("max_lon").notNull(),
  processingLevel: text("processing_level").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  wmsUrl: text("wms_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSatelliteSceneSchema = createInsertSchema(satelliteScenesTable).omit({ id: true, createdAt: true });
export type InsertSatelliteScene = z.infer<typeof insertSatelliteSceneSchema>;
export type SatelliteScene = typeof satelliteScenesTable.$inferSelect;
