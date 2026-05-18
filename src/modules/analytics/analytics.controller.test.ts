import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsRepository } from "./analytics.repository";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./analytics.repository");

const FACILITY_ID = "11111111-1111-1111-1111-111111111111";

function makeRes() {
  const res = {} as Response;
  (res as any).status = jest.fn().mockReturnValue(res);
  (res as any).json = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(query: Record<string, unknown>): AuthRequest {
  return {
    query,
    context: {
      facilityId: FACILITY_ID,
      userId: "u-doc",
      role: "doctor",
      userType: "doctor",
    },
  } as unknown as AuthRequest;
}

// `catchAsync` wraps the handler so the outer fn returns void — `await
// handle()` resolves before the inner promise chain finishes. Flush
// microtasks so res.status / res.json / next have actually been called.
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.clearAllMocks();
  (AnalyticsRepository as unknown as jest.Mock).mockImplementation(() => ({
    totalPatients: jest.fn().mockResolvedValue({ total: 42 }),
  }));
});

describe("AnalyticsController", () => {
  const controller = new AnalyticsController();
  const RANGE = {
    fromDate: "2025-05-18",
    toDate: "2026-05-18",
  };

  it("calls next with a 400 when method is missing", async () => {
    const req = makeReq({ ...RANGE });
    const res = makeRes();
    const next = jest.fn();

    await controller.handle(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toMatch(/method.*required/i);
  });

  it("calls next with a 400 for an unknown method", async () => {
    const req = makeReq({ method: "BOGUS_METHOD", ...RANGE });
    const res = makeRes();
    const next = jest.fn();

    await controller.handle(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toMatch(/Unknown analytics method/);
  });

  it("returns the analytics envelope on success", async () => {
    const req = makeReq({ method: "TOTAL_PATIENTS", ...RANGE });
    const res = makeRes();
    const next = jest.fn();

    await controller.handle(req, res, next);
    await flush();

    expect(next).not.toHaveBeenCalled();
    expect((res as any).status).toHaveBeenCalledWith(200);
    const payload = (res as any).json.mock.calls[0][0];
    expect(payload).toMatchObject({
      success: true,
      data: {
        method: "TOTAL_PATIENTS",
        scope: "facility",
        facilityId: FACILITY_ID,
        result: { total: 42 },
      },
    });
    expect(payload.data.range.from).toBe("2025-05-18");
    expect(payload.data.range.to).toBe("2026-05-18");
  });

  it("trims whitespace-only facilityId and falls back to the caller's facility", async () => {
    const req = makeReq({
      method: "TOTAL_PATIENTS",
      facilityId: "   ",
      ...RANGE,
    });
    const res = makeRes();
    const next = jest.fn();

    await controller.handle(req, res, next);
    await flush();

    const payload = (res as any).json.mock.calls[0][0];
    expect(payload.data.facilityId).toBe(FACILITY_ID);
  });

  it("forwards a 403 from the service when a non-admin requests scope=all", async () => {
    const req = makeReq({
      method: "TOTAL_PATIENTS",
      facilityId: "all",
      ...RANGE,
    });
    const res = makeRes();
    const next = jest.fn();

    await controller.handle(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
