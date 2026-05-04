import { Router } from "express";
import { ReferenceDataController } from "../modules/refrence-data/reference-data.controller";

const router = Router();
const controller = new ReferenceDataController();

router.get("/provinces", controller.listProvinces);
router.get("/districts", controller.listDistricts);
router.get("/municipalities", controller.listMunicipalities);

export default router;
