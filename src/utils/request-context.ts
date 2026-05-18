import { AsyncLocalStorage } from "async_hooks";
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

/**
 * Per-request store carried through async hooks. Populated by the request-id
 * middleware (requestId, ip) and the logger middleware (userId, facilityId, role)
 * after authMiddleware has populated req.user.
 *
 * Outside an HTTP request (CLI seed/migrate, tests) the store is undefined —
 * getCurrentContext() returns {} so callers never need to null-check.
 */
export interface RequestContextStore {
  requestId: string;
  ip?: string;
  userId?: string;
  facilityId?: string;
  role?: string;
  userType?: string;
}

export const requestContextAls =
  new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(
  store: RequestContextStore,
  fn: () => T,
): T {
  return requestContextAls.run(store, fn);
}

export function getCurrentRequestContext(): Partial<RequestContextStore> {
  return requestContextAls.getStore() ?? {};
}

/**
 * Mutates the active store in place. Use after authMiddleware to attach
 * userId/facilityId/role so all downstream logs auto-include them.
 */
export function setRequestContext(
  patch: Partial<RequestContextStore>,
): void {
  const store = requestContextAls.getStore();
  if (!store) return;
  Object.assign(store, patch);
}
