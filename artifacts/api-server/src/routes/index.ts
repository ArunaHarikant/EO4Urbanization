import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import aoiRouter from "./aoi";
import analysisRouter from "./analysis";
import feedRouter from "./feed";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);
router.use(aoiRouter);
router.use(analysisRouter);
router.use(feedRouter);

export default router;
