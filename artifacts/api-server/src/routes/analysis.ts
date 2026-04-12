import { Router, type IRouter } from "express";
import { db, changeEventsTable, urbanStatsTable } from "@workspace/db";
import { and, gte, lte, eq, asc } from "drizzle-orm";
import {
  DetectUrbanChangesBody,
  GetUrbanStatsQueryParams,
  GetAnalysisSummaryQueryParams,
  DetectUrbanChangesResponse,
  GetUrbanStatsResponse,
  GetAnalysisSummaryResponse,
} from "@workspace/api-zod";
import { runChangeDetection } from "../lib/changeDetection";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

router.post("/analysis/detect", async (req, res): Promise<void> => {
  const parsed = DetectUrbanChangesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { minLat, maxLat, minLon, maxLon, startDate, endDate, source } = parsed.data;

  const result = runChangeDetection({
    bbox: { minLat, maxLat, minLon, maxLon },
    startDate,
    endDate,
    source: source ?? "both",
  });

  // Persist detected events to DB
  const inserted = await Promise.all(
    result.events.map((event) =>
      db
        .insert(changeEventsTable)
        .values({
          location: event.location,
          lat: event.lat,
          lon: event.lon,
          source: event.source,
          eventDate: event.eventDate,
          magnitude: event.magnitude,
          changeType: event.changeType,
          areaKm2: event.areaKm2,
          description: event.description,
          thumbnailUrl: null,
        })
        .returning()
    )
  );

  const events = inserted.map((r) => r[0]);

  const response = {
    jobId: uuidv4(),
    source: source ?? "both",
    startDate,
    endDate,
    changedAreaKm2: result.changedAreaKm2,
    changePercent: result.changePercent,
    method: result.method,
    geoJson: result.geoJson,
    baselineSceneIds: [],
    analysisSceneIds: [],
    events: events.map((e) => ({
      ...e,
      thumbnailUrl: e.thumbnailUrl ?? null,
      createdAt: e.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  };

  res.json(DetectUrbanChangesResponse.parse(response));
});

router.get("/analysis/stats", async (req, res): Promise<void> => {
  const query = GetUrbanStatsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { aoiId, granularity } = query.data;

  const conditions = [];
  if (aoiId != null) {
    conditions.push(eq(urbanStatsTable.aoiId, aoiId));
  }

  const stats = await db
    .select()
    .from(urbanStatsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(urbanStatsTable.date));

  res.json(
    GetUrbanStatsResponse.parse({
      aoiId: aoiId ?? null,
      granularity: granularity ?? "monthly",
      timeSeries: stats.map((s) => ({
        date: s.date,
        urbanAreaKm2: s.urbanAreaKm2,
        vegetationAreaKm2: s.vegetationAreaKm2,
        waterAreaKm2: s.waterAreaKm2,
        bareLandAreaKm2: s.bareLandAreaKm2,
        growthRatePercent: s.growthRatePercent ?? null,
      })),
    })
  );
});

router.get("/analysis/summary", async (req, res): Promise<void> => {
  const query = GetAnalysisSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  // Get latest stats row for summary
  const allStats = await db.select().from(urbanStatsTable).orderBy(asc(urbanStatsTable.date));
  const latestStat = allStats[allStats.length - 1];

  if (!latestStat) {
    // Return default summary if no data yet
    res.json(
      GetAnalysisSummaryResponse.parse({
        totalUrbanAreaKm2: 0,
        totalAreaKm2: 0,
        urbanCoveragePercent: 0,
        annualGrowthRatePercent: 0,
        recentGrowthKm2: 0,
        activeRegionsCount: 0,
        lastUpdated: new Date().toISOString(),
        landUseSummary: {
          urbanPercent: 0,
          vegetationPercent: 0,
          waterPercent: 0,
          bareLandPercent: 0,
        },
        topGrowthRegions: [],
      })
    );
    return;
  }

  const firstStat = allStats[0];
  const totalLand =
    (latestStat.urbanAreaKm2 ?? 0) +
    (latestStat.vegetationAreaKm2 ?? 0) +
    (latestStat.waterAreaKm2 ?? 0) +
    (latestStat.bareLandAreaKm2 ?? 0);

  const totalFirst =
    (firstStat.urbanAreaKm2 ?? 0) +
    (firstStat.vegetationAreaKm2 ?? 0) +
    (firstStat.waterAreaKm2 ?? 0) +
    (firstStat.bareLandAreaKm2 ?? 0);

  const annualGrowthRate =
    totalFirst > 0
      ? (((latestStat.urbanAreaKm2 ?? 0) - (firstStat.urbanAreaKm2 ?? 0)) /
          (firstStat.urbanAreaKm2 ?? 1)) *
        100
      : 0;

  // Recent events
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEvents = await db
    .select()
    .from(changeEventsTable)
    .where(gte(changeEventsTable.eventDate, thirtyDaysAgo.toISOString().split("T")[0]));

  const recentGrowthKm2 = recentEvents.reduce((sum, e) => sum + (e.areaKm2 ?? 0), 0);

  res.json(
    GetAnalysisSummaryResponse.parse({
      totalUrbanAreaKm2: Math.round((latestStat.urbanAreaKm2 ?? 0) * 10) / 10,
      totalAreaKm2: Math.round(totalLand * 10) / 10,
      urbanCoveragePercent:
        totalLand > 0
          ? Math.round(((latestStat.urbanAreaKm2 ?? 0) / totalLand) * 1000) / 10
          : 0,
      annualGrowthRatePercent: Math.round(annualGrowthRate * 10) / 10,
      recentGrowthKm2: Math.round(recentGrowthKm2 * 100) / 100,
      activeRegionsCount: new Set(recentEvents.map((e) => e.location)).size,
      lastUpdated: latestStat.createdAt?.toISOString() ?? new Date().toISOString(),
      landUseSummary: {
        urbanPercent:
          totalLand > 0
            ? Math.round(((latestStat.urbanAreaKm2 ?? 0) / totalLand) * 1000) / 10
            : 0,
        vegetationPercent:
          totalLand > 0
            ? Math.round(((latestStat.vegetationAreaKm2 ?? 0) / totalLand) * 1000) / 10
            : 0,
        waterPercent:
          totalLand > 0
            ? Math.round(((latestStat.waterAreaKm2 ?? 0) / totalLand) * 1000) / 10
            : 0,
        bareLandPercent:
          totalLand > 0
            ? Math.round(((latestStat.bareLandAreaKm2 ?? 0) / totalLand) * 1000) / 10
            : 0,
      },
      topGrowthRegions: recentEvents.slice(0, 5).map((e) => ({
        name: e.location,
        lat: e.lat,
        lon: e.lon,
        growthKm2: e.areaKm2 ?? 0,
        growthPercent: (e.magnitude ?? 0) * 100,
      })),
    })
  );
});

export default router;
