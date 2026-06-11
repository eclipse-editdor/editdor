/********************************************************************************
 * Copyright (c) 2018 Contributors to the Eclipse Foundation
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
import {
  extractSchemaUrisFromContext,
  extractSchemaUriFromBase,
  fetchSchemas,
  updateSchemaCache,
} from "./workerFunctions";

import { isThingModel } from "../utils/tdOperations";

// If the JSON sent to the worker is faulty it returns the last valid schema map.
let lastSentSchemaMap = new Map();

const tdSchema =
  "https://raw.githubusercontent.com/w3c/wot-resources/refs/heads/main/td/v1.1/validation/td-json-schema-validation.json";
const tmSchema =
  "https://raw.githubusercontent.com/w3c/wot-resources/refs/heads/main/td/v1.1/validation/tm-json-schema-validation.json";

self.onmessage = async (message) => {
  // Check that prevents messages sent from webpack and react scripts to be executed.
  // Not sure why this is happening at the moment. This is only a "quick" fix.
  if (!(typeof message.data === "string" || message.data instanceof String)) {
    return;
  }

  let td = {};
  try {
    td = JSON.parse(message.data);
  } catch (e) {
    console.debug(`ran into error while parsing TD: ${e}`);
    postMessage(lastSentSchemaMap);
    return;
  }

  if (typeof td !== "object" || td.constructor === Array || !td) {
    return;
  }

  let basicSchema = !isThingModel(td) ? tdSchema : tmSchema;
  let contextSchemaUris = extractSchemaUrisFromContext(td["@context"]);
  let baseSchemaUris = extractSchemaUriFromBase(td);

  let newSchemas = [basicSchema, ...contextSchemaUris, ...baseSchemaUris];
  if (isThingModel) {
    newSchemas = newSchemas.filter(
      (schema) => schema !== "https://www.w3.org/2019/wot/td/v1"
    );
  }

  let schemaMap = await fetchSchemas(newSchemas);
  updateSchemaCache(schemaMap);

  lastSentSchemaMap = schemaMap;
  postMessage(schemaMap);
  console.debug("schema worker sent response...");
};
