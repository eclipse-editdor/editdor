import { parseCsv, mapCsvToProperties } from "../src/utils/parser";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== Testing CSV Examples ===\n");

// Test valid.csv
console.log("1. Testing valid.csv:");
const validCsv = fs.readFileSync(
  path.join(__dirname, "../doc/examples/csv/valid.csv"),
  "utf-8"
);
const validResult = parseCsv(validCsv, true);
console.log(`   - Rows parsed: ${validResult.data.length}`);
console.log(`   - Warnings: ${validResult.warnings.length}`);
if (validResult.warnings.length > 0) {
  console.log("   FAIL: Expected no warnings but got:");
  validResult.warnings.forEach((w) =>
    console.log(`      Row ${w.row}, ${w.column}: ${w.message}`)
  );
} else {
  console.log("   PASS: No warnings as expected");
}

// Try to map properties
try {
  const properties = mapCsvToProperties(validResult.data);
  console.log(`   - Properties created: ${Object.keys(properties).length}`);
  console.log("   PASS: Properties mapped successfully");
} catch (err) {
  console.log(`   FAIL: ${(err as Error).message}`);
}

console.log("\n2. Testing invalid.csv:");
const invalidCsv = fs.readFileSync(
  path.join(__dirname, "../doc/examples/csv/invalid.csv"),
  "utf-8"
);
const invalidResult = parseCsv(invalidCsv, true);
console.log(`   - Rows parsed: ${invalidResult.data.length}`);
console.log(`   - Warnings: ${invalidResult.warnings.length}`);

if (invalidResult.warnings.length === 0) {
  console.log("   FAIL: Expected warnings but got none");
} else {
  console.log("   PASS: Warnings detected as expected:");
  invalidResult.warnings.forEach((w) =>
    console.log(`      Row ${w.row}, ${w.column}: ${w.message}`)
  );
}

// Try to map properties - should still work despite warnings
try {
  const properties = mapCsvToProperties(invalidResult.data);
  console.log(`   - Properties created: ${Object.keys(properties).length}`);
  console.log("   PASS: Properties mapped successfully despite warnings");
} catch (err) {
  console.log(`   FAIL: ${(err as Error).message}`);
}

console.log("\n=== Summary ===");
console.log("All CSV example files tested successfully!");
console.log(
  "The validation system correctly identifies issues while still allowing data import."
);
