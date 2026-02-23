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

type Section = "actions" | "properties" | "events";

interface CopyAffordanceParams {
  parsedTD: any;
  section: Section;
  originalName: string;
  affordance: any;
}

export function copyAffordance({
  parsedTD,
  section,
  originalName,
  affordance,
}: CopyAffordanceParams): { updatedTD: any; newName: string } {
  if (!parsedTD || !parsedTD[section]) {
    throw new Error(`TD or section "${section}" missing`);
  }

  const originalSection = parsedTD[section];

  let newName = `${originalName}_copy`;
  let counter = 1;

  while (originalSection[newName]) {
    newName = `${originalName}_copy_${counter++}`;
  }

  const copiedAffordance = structuredClone(affordance);

  if (copiedAffordance.title) {
    copiedAffordance.title = `${copiedAffordance.title} copy`;
  }

  const entries = Object.entries(originalSection);
  const newEntries: [string, any][] = [];

  for (const [key, value] of entries) {
    newEntries.push([key, value]);

    if (key === originalName) {
      newEntries.push([newName, copiedAffordance]);
    }
  }

  const updatedSection = Object.fromEntries(newEntries);

  const updatedTD = {
    ...parsedTD,
    [section]: updatedSection,
  };

  return { updatedTD, newName };
}
