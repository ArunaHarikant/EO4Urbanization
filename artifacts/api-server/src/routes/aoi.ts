import { Router, type IRouter } from "express";
import { db, areasOfInterestTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListAoisResponse,
  CreateAoiBody,
  GetAoiParams,
  GetAoiResponse,
  DeleteAoiParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function calculateAreaKm2(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  const latDiff = maxLat - minLat;
  const lonDiff = maxLon - minLon;
  const avgLat = (minLat + maxLat) / 2;
  const kmPerDegLat = 111.32;
  const kmPerDegLon = 111.32 * Math.cos((avgLat * Math.PI) / 180);
  return Math.abs(latDiff * kmPerDegLat * lonDiff * kmPerDegLon);
}

function serializeAoi(aoi: typeof areasOfInterestTable.$inferSelect) {
  return {
    ...aoi,
    description: aoi.description ?? null,
    createdAt: aoi.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: aoi.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

router.get("/aoi", async (_req, res): Promise<void> => {
  const aois = await db.select().from(areasOfInterestTable);
  res.json(ListAoisResponse.parse(aois.map(serializeAoi)));
});

router.post("/aoi", async (req, res): Promise<void> => {
  const parsed = CreateAoiBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, minLat, maxLat, minLon, maxLon } = parsed.data;
  const areaKm2 = calculateAreaKm2(minLat, maxLat, minLon, maxLon);

  const [aoi] = await db
    .insert(areasOfInterestTable)
    .values({ name, description: description ?? null, minLat, maxLat, minLon, maxLon, areaKm2 })
    .returning();

  res.status(201).json(GetAoiResponse.parse(serializeAoi(aoi)));
});

router.get("/aoi/:id", async (req, res): Promise<void> => {
  const params = GetAoiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [aoi] = await db
    .select()
    .from(areasOfInterestTable)
    .where(eq(areasOfInterestTable.id, params.data.id));

  if (!aoi) {
    res.status(404).json({ error: "Area of Interest not found" });
    return;
  }

  res.json(GetAoiResponse.parse(serializeAoi(aoi)));
});

router.delete("/aoi/:id", async (req, res): Promise<void> => {
  const params = DeleteAoiParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [aoi] = await db
    .delete(areasOfInterestTable)
    .where(eq(areasOfInterestTable.id, params.data.id))
    .returning();

  if (!aoi) {
    res.status(404).json({ error: "Area of Interest not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
