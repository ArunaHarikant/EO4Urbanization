import { Router, type IRouter } from "express";
import { db, satelliteScenesTable } from "@workspace/db";
import { and, gte, lte, eq, desc } from "drizzle-orm";
import {
  ListScenesQueryParams,
  GetSceneParams,
  ListScenesResponse,
  GetSceneResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/scenes", async (req, res): Promise<void> => {
  const query = ListScenesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { source, startDate, endDate, limit } = query.data;

  const conditions = [];
  if (source && source !== "all") {
    conditions.push(eq(satelliteScenesTable.source, source));
  }
  if (startDate) {
    conditions.push(gte(satelliteScenesTable.acquisitionDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(satelliteScenesTable.acquisitionDate, endDate));
  }

  const scenes = await db
    .select()
    .from(satelliteScenesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(satelliteScenesTable.acquisitionDate))
    .limit(limit ?? 20);

  res.json(ListScenesResponse.parse(scenes.map((s) => ({ ...s, createdAt: s.createdAt?.toISOString() ?? new Date().toISOString() }))));
});

router.get("/scenes/:id", async (req, res): Promise<void> => {
  const params = GetSceneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [scene] = await db
    .select()
    .from(satelliteScenesTable)
    .where(eq(satelliteScenesTable.id, params.data.id));

  if (!scene) {
    res.status(404).json({ error: "Scene not found" });
    return;
  }

  res.json(GetSceneResponse.parse({ ...scene, createdAt: scene.createdAt?.toISOString() ?? new Date().toISOString() }));
});

export default router;
