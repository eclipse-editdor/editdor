/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
import { test, expect, describe } from "vitest";
import { parseCsv, mapRowToProperty, mapCsvToProperties } from "./parser";
import type { CsvData } from "./parser";

describe("parseCsv", () => {
  test("should parse CSV content with headers correctly", () => {
    const csvContent = `name,type,modbus:address,modbus:entity,modbus:unitID,modbus:quantity,modbus:zeroBasedAddressing,modbus:function,modbus:mostSignificantByte,modbus:mostSignificantWord,href
temperature,number,40001,coil,1,2,false,03,true,true,/temperature`;

    const { data, warnings } = parseCsv(csvContent, true);

    expect(data).toEqual([
      {
        name: "temperature",
        type: "number",
        "modbus:address": "40001",
        "modbus:entity": "coil",
        "modbus:unitID": "1",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
        href: "/temperature",
      },
    ]);
    expect(warnings).toEqual([]);
  });

  test("should handle empty CSV content", () => {
    expect(() => parseCsv("", true)).toThrow("CSV content is empty");
  });

  test("should trim header names and values", () => {
    const csv = ` name , type , modbus:address , modbus:entity , href
  temperature  , number , 40001 , coil  , /temperature `;
    const { data } = parseCsv(csv, true);
    expect(data[0].name).toBe("temperature");
    expect(data[0].type).toBe("number");
    expect(data[0]["modbus:address"]).toBe("40001");
    expect(data[0]["modbus:entity"]).toBe("coil");
    expect(data[0].href).toBe("/temperature");
    // Header keys trimmed (no spaces around)
    expect(Object.keys(data[0])).toContain("name");
  });

  test("should remove rows that are entirely empty or whitespace-only", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,/temperature

,,,,


humidity,number,40003,holding,/humidity
`;
    const { data } = parseCsv(csv, true);
    expect(data.length).toBe(2);
    expect(data[0].name).toBe("temperature");
    expect(data[1].name).toBe("humidity");
  });

  test("should keep empty cells as empty strings", () => {
    const csv = `name,type,modbus:address,modbus:entity,href,unit,minimum,maximum
temperature,number,40001,coil,/temperature,,,`;
    const { data } = parseCsv(csv, true);
    expect(data[0].unit).toBe(""); // transform sets null/undefined -> ""
    expect(data[0].minimum).toBe("");
    expect(data[0].maximum).toBe("");
  });

  test("should ignore completely blank trailing row", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,/temperature
`;
    const { data } = parseCsv(csv, true);
    expect(data.length).toBe(1);
  });

  test("should parse multiple rows preserving string types (dynamicTyping=false)", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,/temperature
pressure,number,40002,coil,/pressure`;
    const { data } = parseCsv(csv, true);
    expect(data[0]["modbus:address"]).toBe("40001");
    expect(typeof data[0]["modbus:address"]).toBe("string");
  });

  test("should throw a descriptive error for malformed quoted fields", () => {
    // Unmatched quote will trigger Papa parse error of type "Quotes"
    const csv = `name,type,modbus:address,modbus:entity,href
"temperature,number,40001,coil,/temperature`;
    expect(() => parseCsv(csv, true)).toThrow(/Row/);
  });

  test("should throw error on parsing a row with missing columns", () => {
    const csv = `name,type,modbus:address,modbus:entity,href,unit
temperature,number,40001,coil,/temperature`;
    expect(() => parseCsv(csv, true)).toThrow(/Row/); // absent header cell => undefined key
  });

  test("should filter out rows where all values become empty after trim", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,/temperature
 , , , ,
humidity,number,40003,holding,/humidity`;
    const { data } = parseCsv(csv, true);
    expect(data.map((r) => r.name)).toEqual(["temperature", "humidity"]);
  });

  test("should handle values consisting only of whitespace and convert them to empty strings", () => {
    const csv = `name,type,modbus:address,modbus:entity,href,unit
temperature,number,40001,coil,/temperature,   `;
    const { data } = parseCsv(csv, true);
    expect(data[0].unit).toBe("");
  });

  test("should not include a row where every field resolves to empty string", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,/temperature
,,,,
`;
    const { data } = parseCsv(csv, true);
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("temperature");
  });

  test("should preserve empty href and still keep the row", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,coil,`;
    const { data } = parseCsv(csv, true);
    expect(data[0].href).toBe("");
  });

  test("should parse header with trailing delimiter producing empty last column", () => {
    const csv = `name,type,modbus:address,modbus:entity,href,
temperature,number,40001,coil,/temperature,`;
    const { data } = parseCsv(csv, true);
    // Last header trimmed to "" becomes ignored by Papa (no field name) or blank key
    // Ensure primary fields still parsed
    expect(data[0].name).toBe("temperature");
  });

  test("should handle mixture of populated and partially empty rows", () => {
    const csv = `name,type,modbus:address,modbus:entity,href,unit
temperature,number,40001,coil,/temperature,celsius
humidity,number,40003,holding,/humidity,`;
    const { data } = parseCsv(csv, true);
    expect(data.length).toBe(2);
    expect(data[0].unit).toBe("celsius");
    expect(data[1].unit).toBe("");
  });

  test("should collect warnings for invalid types", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,invalid_type,40001,HoldingRegister,/temperature`;
    const { data, warnings } = parseCsv(csv, true);
    expect(data.length).toBe(1);
    expect(warnings).toEqual([
      {
        row: 2,
        column: "type",
        message: 'Invalid type "invalid_type"',
      },
    ]);
  });

  test("should collect warnings for invalid modbus entities", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,number,40001,InvalidEntity,/temperature`;
    const { data, warnings } = parseCsv(csv, true);
    expect(data.length).toBe(1);
    expect(warnings).toEqual([
      {
        row: 2,
        column: "modbus:entity",
        message: 'Invalid modbus entity "InvalidEntity"',
      },
    ]);
  });

  test("should collect multiple warnings", () => {
    const csv = `name,type,modbus:address,modbus:entity,href
temperature,invalid_type,40001,InvalidEntity,/temperature
humidity,string,40002,HoldingRegister,/humidity`;
    const { data, warnings } = parseCsv(csv, true);
    expect(data.length).toBe(2);
    expect(warnings).toEqual([
      {
        row: 2,
        column: "type",
        message: 'Invalid type "invalid_type"',
      },
      {
        row: 2,
        column: "modbus:entity",
        message: 'Invalid modbus entity "InvalidEntity"',
      },
    ]);
  });
});

describe("mapRowToProperty", () => {
  test("should correctly convert all fields", () => {
    const row: CsvData = {
      name: "temperature",
      title: "Temperature",
      description: "Room temperature",
      type: "number",
      minimum: "0",
      maximum: "100",
      unit: "celsius",
      href: "/temperature",
      "modbus:unitID": 1,
      "modbus:address": "40001",
      "modbus:quantity": "2",
      "modbus:type": "int16",
      "modbus:zeroBasedAddressing": "true",
      "modbus:entity": "holding",
      "modbus:pollingTime": "1000",
      "modbus:function": "03",
      "modbus:mostSignificantByte": "false",
      "modbus:mostSignificantWord": "true",
      "modbus:timeout": "500",
    };

    const result = mapRowToProperty(row);

    expect(result).toEqual({
      type: "number",
      readOnly: true,
      title: "Temperature",
      description: "Room temperature",
      minimum: 0,
      maximum: 100,
      unit: "celsius",
      forms: [
        {
          op: "readproperty",
          href: "/temperature",
          "modbus:unitID": 1,
          "modbus:address": 40001,
          "modbus:quantity": 2,
          "modbus:type": "int16",
          "modbus:zeroBasedAddressing": true,
          "modbus:entity": "holding",
          "modbus:pollingTime": "1000",
          "modbus:function": "03",
          "modbus:mostSignificantByte": false,
          "modbus:mostSignificantWord": true,
          "modbus:timeout": "500",
        },
      ],
    });
  });

  test("should handle missing optional fields", () => {
    const row: CsvData = {
      name: "temperature",
      type: "number",
      href: "",
      "modbus:unitID": 1,
      "modbus:address": "40001",
      "modbus:quantity": "2",
      "modbus:zeroBasedAddressing": "false",
      "modbus:entity": "holding",
      "modbus:function": "03",
      "modbus:mostSignificantByte": "true",
      "modbus:mostSignificantWord": "true",
    };

    const result = mapRowToProperty(row);

    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.minimum).toBeUndefined();
    expect(result.maximum).toBeUndefined();
    expect(result.unit).toBeUndefined();
    expect(result.forms[0].href).toBe("/");
    expect(result.forms[0]["modbus:pollingTime"]).toBeUndefined();
    expect(result.forms[0]["modbus:timeout"]).toBeUndefined();
  });

  test("should apply correct boolean conversions", () => {
    const row: CsvData = {
      name: "temperature",
      type: "number",
      href: "/temperature",
      "modbus:unitID": 1,
      "modbus:address": "40001",
      "modbus:quantity": "2",
      "modbus:zeroBasedAddressing": "true",
      "modbus:entity": "holding",
      "modbus:function": "03",
      "modbus:mostSignificantByte": "false",
      "modbus:mostSignificantWord": "false",
    };

    const result = mapRowToProperty(row);

    expect(result.forms[0]["modbus:zeroBasedAddressing"]).toBe(true);
    expect(result.forms[0]["modbus:mostSignificantByte"]).toBe(false);
    expect(result.forms[0]["modbus:mostSignificantWord"]).toBe(false);
  });
});

describe("mapCsvToProperties", () => {
  test("should convert multiple rows correctly", () => {
    const data: CsvData[] = [
      {
        name: "temperature",
        type: "number",
        href: "/temperature",
        "modbus:unitID": 1,
        "modbus:address": "40001",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "holding",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
      {
        name: "humidity",
        type: "number",
        href: "/humidity",
        "modbus:unitID": 1,
        "modbus:address": "40003",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "holding",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
    ];

    const result = mapCsvToProperties(data);

    expect(Object.keys(result)).toEqual(["temperature", "humidity"]);
    expect(result.temperature.forms[0]["modbus:address"]).toBe(40001);
    expect(result.humidity.forms[0]["modbus:address"]).toBe(40003);
  });

  test("should throw error when name is missing", () => {
    const data: CsvData[] = [
      {
        name: "",
        type: "number",
        href: "/temperature",
        "modbus:unitID": 1,
        "modbus:address": "40001",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "holding",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
    ];

    expect(() => mapCsvToProperties(data)).toThrow(
      "Error on CSV file: Row name is required"
    );
  });

  test("should throw error when modbus:address is missing", () => {
    const data: CsvData[] = [
      {
        name: "temperature",
        type: "number",
        href: "/temperature",
        "modbus:unitID": 1,
        "modbus:address": "",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "holding",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
    ];

    expect(() => mapCsvToProperties(data)).toThrow(
      'Error on CSV file: "modbus:address" value is required for row: "temperature"'
    );
  });

  test("should throw error when modbus:entity is missing", () => {
    const data: CsvData[] = [
      {
        name: "temperature",
        type: "number",
        href: "/temperature",
        "modbus:unitID": 1,
        "modbus:address": "40001",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
    ];

    expect(() => mapCsvToProperties(data)).toThrow(
      'Error on CSV file: "modbus:entity" value is required for row: "temperature"'
    );
  });

  test("should handle empty data array", () => {
    expect(mapCsvToProperties([])).toEqual({});
  });

  test("should handle a mix of complete and partial data", () => {
    const data: CsvData[] = [
      {
        name: "temperature",
        title: "Temperature",
        description: "Room temperature",
        type: "number",
        minimum: "0",
        maximum: "100",
        unit: "celsius",
        href: "/temperature",
        "modbus:unitID": 1,
        "modbus:address": "40001",
        "modbus:quantity": "2",
        "modbus:type": "int16",
        "modbus:zeroBasedAddressing": "true",
        "modbus:entity": "holding",
        "modbus:pollingTime": "1000",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "false",
        "modbus:mostSignificantWord": "true",
        "modbus:timeout": "500",
      },
      {
        name: "humidity",
        type: "number",
        href: "/humidity",
        "modbus:unitID": 1,
        "modbus:address": "40003",
        "modbus:quantity": "2",
        "modbus:zeroBasedAddressing": "false",
        "modbus:entity": "holding",
        "modbus:function": "03",
        "modbus:mostSignificantByte": "true",
        "modbus:mostSignificantWord": "true",
      },
    ];

    const result = mapCsvToProperties(data);

    expect(result.temperature.title).toBe("Temperature");
    expect(result.temperature.unit).toBe("celsius");
    expect(result.humidity.title).toBeUndefined();
    expect(result.humidity.unit).toBeUndefined();
  });
});
