jest.mock("../db", () => ({ db: { select: jest.fn() } }));

import { hasPermission } from "./rbac.middleware";

describe("hasPermission", () => {
  it("matches an exact unscoped permission", () => {
    expect(hasPermission(["patient:read"], "patient:read")).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    expect(hasPermission(["patient:read"], "patient:create")).toBe(false);
    expect(hasPermission([], "patient:read")).toBe(false);
    expect(hasPermission(undefined, "patient:read")).toBe(false);
  });

  it("lets a higher scope cover a lower scope (all > facility > ward > own)", () => {
    expect(hasPermission(["patient:read:all"], "patient:read:facility")).toBe(
      true,
    );
    expect(hasPermission(["patient:read:facility"], "patient:read:own")).toBe(
      true,
    );
    expect(hasPermission(["patient:read:own"], "patient:read:facility")).toBe(
      false,
    );
  });

  it("does not cross subjects or actions", () => {
    expect(hasPermission(["patient:read:all"], "patient:create:own")).toBe(
      false,
    );
    expect(hasPermission(["patient:read:all"], "user:read:own")).toBe(false);
  });
});
