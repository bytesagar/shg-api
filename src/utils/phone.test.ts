import { normalizeNepaliPhone } from "./phone";

describe("normalizeNepaliPhone", () => {
  it("prefixes a bare 10-digit mobile", () => {
    expect(normalizeNepaliPhone("9841234567")).toBe("+9779841234567");
  });

  it("accepts already-prefixed numbers", () => {
    expect(normalizeNepaliPhone("+9779841234567")).toBe("+9779841234567");
    expect(normalizeNepaliPhone("9779841234567")).toBe("+9779841234567");
  });

  it("strips formatting characters", () => {
    expect(normalizeNepaliPhone("984-123 4567")).toBe("+9779841234567");
    expect(normalizeNepaliPhone("(977) 9841234567")).toBe("+9779841234567");
  });

  it("drops a national-trunk leading zero", () => {
    expect(normalizeNepaliPhone("09841234567")).toBe("+9779841234567");
  });

  it("rejects invalid input", () => {
    expect(normalizeNepaliPhone("12345")).toBeNull();
    expect(normalizeNepaliPhone("8841234567")).toBeNull(); // doesn't start with 9
    expect(normalizeNepaliPhone("984123456")).toBeNull(); // only 9 digits
    expect(normalizeNepaliPhone("")).toBeNull();
    expect(normalizeNepaliPhone(null)).toBeNull();
    expect(normalizeNepaliPhone(undefined)).toBeNull();
  });
});
