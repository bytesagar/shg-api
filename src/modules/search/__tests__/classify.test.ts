import { classifyQuery } from "../classify";

describe("classifyQuery", () => {
  it.each([
    ["9841234567", "phone"], // 10-digit phone
    ["98412345", "phone"], // 8-digit phone
    ["1234567", "phone"], // 7-digit boundary
  ])("classifies %j as %s", (q, expected) => {
    expect(classifyQuery(q)).toBe(expected);
  });

  it.each([
    ["PAT-00231", "patient_id"],
    ["pat-00231", "patient_id"], // case-insensitive
    ["MRN-12", "patient_id"],
    ["SHGP-123", "patient_id"],
  ])("classifies %j as %s", (q, expected) => {
    expect(classifyQuery(q)).toBe(expected);
  });

  it.each([
    ["12", "numeric"],
    ["123", "numeric"],
    ["123456", "numeric"], // 6-digit upper bound for numeric
  ])("classifies %j as %s", (q, expected) => {
    expect(classifyQuery(q)).toBe(expected);
  });

  it.each([
    ["Asha", "name"],
    ["Shanti Bhattarai", "name"],
    ["a", "name"], // single letter
    ["शान्ति", "name"], // unicode
  ])("classifies %j as %s", (q, expected) => {
    expect(classifyQuery(q)).toBe(expected);
  });

  it("trims whitespace before classifying", () => {
    expect(classifyQuery("  9841234567  ")).toBe("phone");
    expect(classifyQuery("  PAT-001  ")).toBe("patient_id");
  });
});
