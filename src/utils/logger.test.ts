/**
 * Logger must be silent in the test environment so the test runner output
 * stays readable. NODE_ENV=test (jest sets this automatically) → silent.
 */
describe("logger", () => {
  it("does not throw when called at any level", () => {
    // Force-reload with NODE_ENV=test so LOG_LEVEL resolves to silent.
    jest.resetModules();
    process.env.NODE_ENV = "test";
    delete process.env.LOG_LEVEL;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logger } = require("./logger");
    expect(() => logger.debug("test.debug")).not.toThrow();
    expect(() => logger.info("test.info", { x: 1 })).not.toThrow();
    expect(() => logger.warn("test.warn", { x: 1 })).not.toThrow();
    expect(() => logger.error("test.error", { err: new Error("e") })).not.toThrow();
  });

  it("redacts password fields in meta without leaking to stdout", () => {
    jest.resetModules();
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "info";
    const writeSpy = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { logger } = require("./logger");
    logger.info("login.attempt", { email: "x@y", password: "secret" });
    const written = writeSpy.mock.calls
      .map((c) => String(c[0]))
      .join("");
    writeSpy.mockRestore();
    delete process.env.LOG_LEVEL;
    expect(written).not.toContain("secret");
    expect(written).toContain("[REDACTED]");
  });
});
