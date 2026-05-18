import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { PusherAuthController } from "../modules/notifications/pusher-auth.controller";

const router = Router();
const controller = new PusherAuthController();

router.use(authMiddleware);

router.post("/auth", controller.auth);

export default router;
