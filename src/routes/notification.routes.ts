import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { NotificationController } from "../modules/notifications/notification.controller";

const router = Router();
const controller = new NotificationController();

router.use(authMiddleware);

router.get("/", controller.list);
router.patch("/:id/seen", controller.markSeen);
router.post("/mark-all-seen", controller.markAllSeen);

export default router;
