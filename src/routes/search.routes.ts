import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { SearchController } from "../modules/search/search.controller";

const router = Router();
const searchController = new SearchController();

// Both endpoints sit behind authMiddleware. Authorization rules (per role
// scoping, FCHV caseload, etc.) live in the service layer because the rules
// don't deny access - they narrow results.
router.get("/", authMiddleware, searchController.search);
router.get("/empty-state", authMiddleware, searchController.emptyState);

export default router;
