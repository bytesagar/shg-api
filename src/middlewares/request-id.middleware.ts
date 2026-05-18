import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import {
  RequestContextStore,
  runWithRequestContext,
} from "../utils/request-context";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

const HEADER = "x-request-id";

/**
 * Generates (or echoes) X-Request-Id and runs the rest of the request
 * inside an AsyncLocalStorage context so every downstream `logger.*` call
 * automatically carries the requestId.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header(HEADER);
  const requestId =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim()
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const xForwardedFor = req.headers["x-forwarded-for"];
  const ip =
    req.ip ||
    (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
    undefined;

  const store: RequestContextStore = { requestId, ip };
  runWithRequestContext(store, () => next());
}
