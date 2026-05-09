import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scenesRouter from "./scenes";
import aoiRouter from "./aoi";
import analysisRouter from "./analysis";
import feedRouter from "./feed";
import informalityRouter from "./informality";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scenesRouter);
router.use(aoiRouter);
router.use(analysisRouter);
router.use(feedRouter);
router.use(informalityRouter);

export default router;
