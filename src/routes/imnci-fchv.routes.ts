import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { COMMUNITY_WRITE_ROLES } from "../constants/rbac";
import { ImnciFchvController } from "../modules/imnci/imnci-fchv.controller";

const router = Router();
const fchv = new ImnciFchvController();

router.use(authMiddleware);
router.use(authorize([...COMMUNITY_WRITE_ROLES]));

router.get("/screenings", fchv.listMine);
router.post("/screenings", fchv.createScreening);
router.post("/screenings/:id/dispensed", fchv.dispense);

export default router;
