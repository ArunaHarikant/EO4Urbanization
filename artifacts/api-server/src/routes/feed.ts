import { Router, type IRouter } from "express";
import { db, changeEventsTable } from "@workspace/db";
import { and, eq, gte, desc } from "drizzle-orm";
import {
  ListChangeEventsQueryParams,
  ListChangeEventsResponse,
  GetFeedSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feed/events", async (req, res): Promise<void> => {
  const query = ListChangeEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit, source, since } = query.data;

  const conditions = [];
  if (source && source !== "all") {
    conditions.push(eq(changeEventsTable.source, source));
  }
  if (since) {
    conditions.push(gte(changeEventsTable.eventDate, since));
  }

  const events = await db
    .select()
    .from(changeEventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(changeEventsTable.createdAt))
    .limit(limit ?? 20);

  res.json(
    ListChangeEventsResponse.parse(
      events.map((e) => ({
        ...e,
        thumbnailUrl: e.thumbnailUrl ?? null,
        createdAt: e.createdAt?.toISOString() ?? new Date().toISOString(),
      }))
    )
  );
});

router.get("/feed/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const allEventsToday = await db
    .select()
    .from(changeEventsTable)
    .where(gte(changeEventsTable.eventDate, todayStr));

  const allEventsWeek = await db
    .select()
    .from(changeEventsTable)
    .where(gte(changeEventsTable.eventDate, weekAgoStr));

  const latestEvent = await db
    .select()
    .from(changeEventsTable)
    .orderBy(desc(changeEventsTable.createdAt))
    .limit(1);

  const sentinel1Count = allEventsWeek.filter((e) => e.source === "sentinel1").length;
  const landsatCount = allEventsWeek.filter((e) => e.source === "landsat").length;
  const activeRegions = new Set(allEventsWeek.map((e) => e.location)).size;

  res.json(
    GetFeedSummaryResponse.parse({
      totalEventsToday: allEventsToday.length,
      totalEventsThisWeek: allEventsWeek.length,
      activeRegionsCount: activeRegions,
      sentinel1EventsCount: sentinel1Count,
      landsatEventsCount: landsatCount,
      lastEventAt: latestEvent[0]?.createdAt?.toISOString() ?? null,
    })
  );
});

export default router;
