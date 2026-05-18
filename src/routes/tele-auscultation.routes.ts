import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { AuscultationController } from "../modules/tele-auscultation/auscultation.controller";

const router = Router();
const controller = new AuscultationController();

router.use(authMiddleware);

router.get("/sessions", controller.list);
router.post("/sessions", controller.start);
router.get("/sessions/:id", controller.getById);
router.post("/sessions/:id/join", controller.join);
router.patch("/sessions/:id/stop", controller.stop);
router.post("/sessions/:id/recording", controller.attachRecording);

export default router;
