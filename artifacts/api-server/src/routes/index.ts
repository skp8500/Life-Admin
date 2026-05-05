import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tasksRouter from "./tasks";
import aiRouter from "./ai";
import plansRouter from "./plans";
import insightsRouter from "./insights";
import geminiRouter from "./gemini";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// All app routes below require authentication
router.use(requireAuth, tasksRouter);
router.use(requireAuth, aiRouter);
router.use(requireAuth, plansRouter);
router.use(requireAuth, insightsRouter);
router.use(requireAuth, geminiRouter);

export default router;
