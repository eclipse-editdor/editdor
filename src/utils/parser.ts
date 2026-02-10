/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
import Papa from "papaparse";

/** ================= CSV WARNING SUPPORT ================= */

export type CsvWarning = {
  row: number;
  column: string;
  message: string;
};

const VALID_TYPES = ["number", "string", "boolean"];
const VALID_MODBUS_ENTITIES = [
  "HoldingRegister",
  "InputRegister",
  "Coil",
  "DiscreteInput",
];

/** ====================================================== */

export type CsvData = {
  name: string;
  title?: string;
  description?: string;
  type: string;
  minimum?: string;
  maximum?: string;
  unit?: string;
  href: string;
  "modbus:unitID": number;
  "modbus:address": string;
  "modbus:quantity": string;
  "modbus:type"?: string;
  "modbus:zeroBasedAddressing": string;
  "modbus:entity": string;
  "modbus:pollingTime"?: string;
  "modbus:function": string;
  "modbus:mostSignificantByte": string;
  "modbus:mostSignificantWord": string;
  "modbus:timeout"?: string;
};

/**
 * Parse CSV and collect warnings
 */
type PropertyForm = {
  op: string | string[];
  href: string;
  "modbus:unitID": number;
  "modbus:address": number;
  "modbus:quantity": number;
  "modbus:type"?: string;
  "modbus:zeroBasedAddressing": boolean;
  "modbus:entity": string;
  "modbus:pollingTime"?: string;
  "modbus:function"?: string;
  "modbus:mostSignificantByte": boolean;
  "modbus:mostSignificantWord": boolean;
  "modbus:timeout"?: string;
};

type Property = {
  type?: string;
  readOnly?: boolean;
  title?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  unit?: string;
  forms: PropertyForm[];
};

type Properties = {
  [key: string]: Property;
};

/**
 * Parse CSV and collect warnings
 */
export const parseCsv = (
  csvContent: string,
  hasHeaders: boolean = true
): { data: CsvData[]; warnings: CsvWarning[] } => {
  if (!csvContent) throw new Error("CSV content is empty");

  const warnings: CsvWarning[] = [];

  const res = Papa.parse<CsvData>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (res.errors.length) {
    throw new Error(
      res.errors.map((e) => `Row ${e.row}: ${e.message}`).join("; ")
    );
  }

  res.data.forEach((row, index) => {
    const rowNum = index + 2;

    if (row.type && !VALID_TYPES.includes(row.type)) {
      warnings.push({
        row: rowNum,
        column: "type",
        message: `Invalid type "${row.type}"`,
      });
    }

    if (row["modbus:entity"]) {
      const entityLower = row["modbus:entity"].toLowerCase();
      const validEntityLower = VALID_MODBUS_ENTITIES.map((e) => e.toLowerCase());
      if (!validEntityLower.includes(entityLower)) {
        warnings.push({
          row: rowNum,
          column: "modbus:entity",
          message: `Invalid modbus entity "${row["modbus:entity"]}"`,
        });
      }
    }
  });

  return {
    data: res.data.filter((row) =>
      Object.values(row).some((v) => v !== "" && v != null)
    ),
    warnings,
  };
};

/**
 *  Helper to safely parse optional numeric CSV fields:
 *
 */
const parseOptionalNumber = (value?: string): number | undefined => {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
};

/**
 *
 * @param row
 * @returns
 */
export const mapRowToProperty = (row: CsvData): Property => ({
  ...(row.type ? { type: row.type } : {}),
  readOnly: true,
  ...(row.title ? { title: row.title } : {}),
  ...(row.description ? { description: row.description } : {}),
  ...(parseOptionalNumber(row.minimum) !== undefined
    ? { minimum: parseOptionalNumber(row.minimum)! }
    : {}),
  ...(parseOptionalNumber(row.maximum) !== undefined
    ? { maximum: parseOptionalNumber(row.maximum)! }
    : {}),
  ...(row.unit ? { unit: row.unit } : {}),
  forms: [
    {
      op: "readproperty",
      href: !row.href ? "/" : row.href,
      "modbus:unitID": Number(row["modbus:unitID"]) ?? 1,
      "modbus:address": Number(row["modbus:address"]),
      "modbus:quantity": Number(row["modbus:quantity"]) ?? 1,
      ...(row["modbus:type"] ? { "modbus:type": row["modbus:type"] } : {}),
      "modbus:zeroBasedAddressing":
        Boolean(row["modbus:zeroBasedAddressing"]) ?? false,
      "modbus:entity": row["modbus:entity"],
      ...(row["modbus:pollingTime"]
        ? { "modbus:pollingTime": row["modbus:pollingTime"] }
        : {}),
      ...(row["modbus:function"]
        ? { "modbus:function": row["modbus:function"] }
        : {}),
      "modbus:mostSignificantByte":
        row["modbus:mostSignificantByte"]?.toLowerCase() === "true"
          ? true
          : false,
      "modbus:mostSignificantWord":
        row["modbus:mostSignificantWord"]?.toLowerCase() === "true"
          ? true
          : false,
      ...(row["modbus:timeout"]
        ? { "modbus:timeout": row["modbus:timeout"] }
        : {}),
    },
  ],
});

/**
 *
 * @param data
 * @returns
 */
export const mapCsvToProperties = (data: CsvData[]): Properties =>
  data.reduce((acc, row) => {
    if (!row.name || row.name.trim() === "") {
      throw new Error("Error on CSV file: Row name is required");
    }
    if (!row["modbus:address"] || row["modbus:address"].trim() === "") {
      throw new Error(
        `Error on CSV file: "modbus:address" value is required for row: "${row.name}"`
      );
    }
    if (!row["modbus:entity"] || row["modbus:entity"].trim() === "") {
      throw new Error(
        `Error on CSV file: "modbus:entity" value is required for row: "${row.name}"`
      );
    }
    acc[row.name] = mapRowToProperty(row);
    return acc;
  }, {} as Properties);
