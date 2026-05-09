import { Router, type IRouter } from "express";
import { db, informalSettlementsTable } from "@workspace/db";
import { and, gte, lte, eq } from "drizzle-orm";
import { runInformalityDetection } from "../lib/informalityDetection";
import { v4 as uuidv4 } from "uuid";

const router: IRouter = Router();

const VALID_RISK_LEVELS = ["critical", "high", "moderate", "low", "all"] as const;
const VALID_SOURCES = ["SAR", "optical", "multi-modal"] as const;

function toApiSettlement(s: typeof informalSettlementsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    city: s.city,
    lat: s.lat,
    lon: s.lon,
    minLat: s.minLat,
    maxLat: s.maxLat,
    minLon: s.minLon,
    maxLon: s.maxLon,
    areaKm2: s.areaKm2,
    estimatedPopulation: s.estimatedPopulation,
    riskLevel: s.riskLevel,
    floodRisk: s.floodRisk,
    heatRisk: s.heatRisk,
    buildingHeightM: s.buildingHeightM ?? null,
    densityPercent: s.densityPercent ?? null,
    detectionMethod: s.detectionMethod,
    detectedAt: s.detectedAt,
    lastUpdated: s.lastUpdated,
    createdAt: s.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

router.get("/informality/settlements", async (req, res): Promise<void> => {
  const riskLevel = (req.query.riskLevel as string) ?? "all";
  const limit = Math.min(parseInt((req.query.limit as string) ?? "50"), 200);
  const minLat = req.query.minLat != null ? parseFloat(req.query.minLat as string) : undefined;
  const maxLat = req.query.maxLat != null ? parseFloat(req.query.maxLat as string) : undefined;
  const minLon = req.query.minLon != null ? parseFloat(req.query.minLon as string) : undefined;
  const maxLon = req.query.maxLon != null ? parseFloat(req.query.maxLon as string) : undefined;

  if (!VALID_RISK_LEVELS.includes(riskLevel as typeof VALID_RISK_LEVELS[number])) {
    res.status(400).json({ error: "Invalid riskLevel" });
    return;
  }

  const conditions = [];
  if (riskLevel !== "all") conditions.push(eq(informalSettlementsTable.riskLevel, riskLevel));
  if (minLat != null && !isNaN(minLat)) conditions.push(gte(informalSettlementsTable.lat, minLat));
  if (maxLat != null && !isNaN(maxLat)) conditions.push(lte(informalSettlementsTable.lat, maxLat));
  if (minLon != null && !isNaN(minLon)) conditions.push(gte(informalSettlementsTable.lon, minLon));
  if (maxLon != null && !isNaN(maxLon)) conditions.push(lte(informalSettlementsTable.lon, maxLon));

  const settlements = await db
    .select()
    .from(informalSettlementsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit);

  res.json(settlements.map(toApiSettlement));
});

router.post("/informality/scan", async (req, res): Promise<void> => {
  const { minLat, maxLat, minLon, maxLon, source = "multi-modal" } = req.body ?? {};

  if (
    typeof minLat !== "number" || typeof maxLat !== "number" ||
    typeof minLon !== "number" || typeof maxLon !== "number"
  ) {
    res.status(400).json({ error: "minLat, maxLat, minLon, maxLon must be numbers" });
    return;
  }
  if (!VALID_SOURCES.includes(source)) {
    res.status(400).json({ error: "Invalid source" });
    return;
  }

  const result = runInformalityDetection({ bbox: { minLat, maxLat, minLon, maxLon }, source });

  const inserted = await Promise.all(
    result.settlements.map((s) =>
      db.insert(informalSettlementsTable).values(s).returning()
    )
  );
  const savedSettlements = inserted.map((r) => r[0]);

  res.json({
    jobId: result.jobId,
    scannedAreaKm2: result.scannedAreaKm2,
    settlementsFound: savedSettlements.length,
    totalPopulationEstimate: savedSettlements.reduce((sum, s) => sum + s.estimatedPopulation, 0),
    source,
    geoJson: result.geoJson,
    settlements: savedSettlements.map(toApiSettlement),
  });
});

router.get("/informality/impact", async (req, res): Promise<void> => {
  const all = await db.select().from(informalSettlementsTable);

  const criticalRiskCount = all.filter((s) => s.riskLevel === "critical").length;
  const highRiskCount = all.filter((s) => s.riskLevel === "high").length;
  const moderateRiskCount = all.filter((s) => s.riskLevel === "moderate").length;
  const lowRiskCount = all.filter((s) => s.riskLevel === "low").length;

  res.json({
    globalPopulationAffected: 1100000000,
    countriesAffected: 128,
    settlementsMonitored: all.length,
    gdpImpactPercent: 10.5,
    lifeExpectancyGainYears: 2.4,
    livesSavedAnnually: 730000,
    childrenInSchool: 41600000,
    criticalRiskCount,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
