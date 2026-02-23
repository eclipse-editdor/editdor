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

import { describe, expect, test } from "vitest";
import { copyAffordance } from "./copyAffordance";

describe("copyAffordance", () => {
  test("creates a copy with a unique name appended with '_copy'", () => {
    const td = {
      actions: {
        reset: {
          title: "Reset Sensor",
          forms: [],
        },
      },
    };

    const { updatedTD, newName } = copyAffordance({
      parsedTD: td,
      section: "actions",
      originalName: "reset",
      affordance: td.actions.reset,
    });

    expect(newName).toBe("reset_copy");
    expect(updatedTD.actions[newName]).toBeDefined();
    expect(updatedTD.actions[newName].title).toBe("Reset Sensor copy");
  });

  test("increments name suffix when '_copy' already exists", () => {
    const resetAffordance = { title: "Reset", forms: [] };
    const td = {
      actions: {
        reset: resetAffordance,
        reset_copy: { title: "Reset copy", forms: [] },
      },
    };

    const { newName } = copyAffordance({
      parsedTD: td,
      section: "actions",
      originalName: "reset",
      affordance: resetAffordance,
    });

    expect(newName).toBe("reset_copy_1");
  });

  test("increments counter further when multiple copies already exist", () => {
    const resetAffordance = { title: "Reset", forms: [] };
    const td = {
      actions: {
        reset: resetAffordance,
        reset_copy: { title: "Reset copy", forms: [] },
        reset_copy_1: { title: "Reset copy 1", forms: [] },
      },
    };

    const { newName } = copyAffordance({
      parsedTD: td,
      section: "actions",
      originalName: "reset",
      affordance: resetAffordance,
    });

    expect(newName).toBe("reset_copy_2");
  });

  test("does not append 'copy' to title when affordance has no title", () => {
    const affordance = { forms: [] };
    const td = {
      properties: {
        temperature: affordance,
      },
    };

    const { updatedTD, newName } = copyAffordance({
      parsedTD: td,
      section: "properties",
      originalName: "temperature",
      affordance,
    });

    expect(newName).toBe("temperature_copy");
    expect(updatedTD.properties[newName].title).toBeUndefined();
  });

  test("inserts the copied affordance immediately after the original", () => {
    const tdAffordance = { title: "Toggle", forms: [] };
    const td = {
      actions: {
        start: { title: "Start", forms: [] },
        toggle: tdAffordance,
        stop: { title: "Stop", forms: [] },
      },
    };

    const { updatedTD } = copyAffordance({
      parsedTD: td,
      section: "actions",
      originalName: "toggle",
      affordance: tdAffordance,
    });

    const keys = Object.keys(updatedTD.actions);
    const originalIndex = keys.indexOf("toggle");
    const copyIndex = keys.indexOf("toggle_copy");

    expect(copyIndex).toBe(originalIndex + 1);
  });

  test("deep clones the affordance so original is not mutated", () => {
    const affordance = { title: "Read", forms: [{ href: "/read" }] };
    const td = {
      properties: {
        status: affordance,
      },
    };

    const { updatedTD, newName } = copyAffordance({
      parsedTD: td,
      section: "properties",
      originalName: "status",
      affordance,
    });

    // Mutating the copy should not affect the original
    updatedTD.properties[newName].forms[0].href = "/mutated";
    expect(affordance.forms[0].href).toBe("/read");
  });

  test("supports 'events' section", () => {
    const eventAffordance = { title: "Overheat Alert", forms: [] };
    const td = {
      events: {
        overheat: eventAffordance,
      },
    };

    const { updatedTD, newName } = copyAffordance({
      parsedTD: td,
      section: "events",
      originalName: "overheat",
      affordance: eventAffordance,
    });

    expect(newName).toBe("overheat_copy");
    expect(updatedTD.events[newName].title).toBe("Overheat Alert copy");
  });

  test("throws an error when parsedTD is null", () => {
    expect(() =>
      copyAffordance({
        parsedTD: null,
        section: "actions",
        originalName: "reset",
        affordance: {},
      })
    ).toThrow('TD or section "actions" missing');
  });

  test("throws an error when the section does not exist in parsedTD", () => {
    const td = { properties: {} };

    expect(() =>
      copyAffordance({
        parsedTD: td,
        section: "actions",
        originalName: "reset",
        affordance: {},
      })
    ).toThrow('TD or section "actions" missing');
  });
});
