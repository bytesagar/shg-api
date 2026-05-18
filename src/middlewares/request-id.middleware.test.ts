import express from "express";
import request from "supertest";
import { requestIdMiddleware } from "./request-id.middleware";
import { getCurrentRequestContext } from "../utils/request-context";

function buildApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.get("/echo", (req, res) => {
    const ctx = getCurrentRequestContext();
    res.json({
      reqId: (req as any).requestId,
      ctxId: ctx.requestId,
    });
  });
  return app;
}

describe("requestIdMiddleware", () => {
  it("generates an id when none is provided", async () => {
    const app = buildApp();
    const res = await request(app).get("/echo");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.reqId).toBe(res.headers["x-request-id"]);
    expect(res.body.ctxId).toBe(res.headers["x-request-id"]);
  });

  it("echoes a client-supplied id", async () => {
    const app = buildApp();
    const supplied = "trace-from-client-123";
    const res = await request(app)
      .get("/echo")
      .set("X-Request-Id", supplied);
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe(supplied);
    expect(res.body.reqId).toBe(supplied);
    expect(res.body.ctxId).toBe(supplied);
  });
});
