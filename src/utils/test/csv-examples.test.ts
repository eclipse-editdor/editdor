import { describe, it, expect } from "vitest";
import { parseCsv } from "../parser";
import fs from "fs";
import path from "path";

describe("CSV example files", () => {
  const validCsv = fs.readFileSync(
    path.join(__dirname, "fixtures", "valid.csv"),
    "utf-8"
  );

  const invalidCsv = fs.readFileSync(
    path.join(__dirname, "fixtures", "invalid.csv"),
    "utf-8"
  );

  it("valid.csv should produce no warnings", () => {
    const result = parseCsv(validCsv, true);
    expect(result.warnings.length).toBe(0);
  });

  it("invalid.csv should produce warnings", () => {
    const result = parseCsv(invalidCsv, true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
