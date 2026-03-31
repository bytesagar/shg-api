import { FacilityContext } from "../context/facility-context";
import { AuthRequest } from "../middlewares/auth.middleware";
import { AppError } from "./app-error";
import { HTTP_STATUS } from "../config/constants";

export function requireFacilityContext(req: AuthRequest): FacilityContext {
  const context = req.context;
  if (!context) {
    throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  }
  return context;
}
