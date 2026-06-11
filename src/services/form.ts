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
import { Core, Http } from "@node-wot/browser-bundle";
import type {
  ConsumedThing,
  ThingDescription,
} from "wot-typescript-definitions";
import type { IFormConfigurations } from "../types/form.d.ts";
import { stripDoubleQuotes } from "../utils/strings.js";
import JSONPointer from "jsonpointer";
import { DataSchemaType } from "wot-thing-description-types";

const servient = new Core.Servient();
servient.addClientFactory(new Http.HttpClientFactory());
servient.addClientFactory(new Http.HttpsClientFactory());
console.log("init servient");

const formConfigurations: Record<string, IFormConfigurations> = {
  readproperty: {
    color: "Green",
    title: "Read",
    level: "properties",
    callback: readPropertyWithServient,
  },
  writeproperty: {
    color: "Blue",
    title: "Write",
    level: "properties",
    callback: writePropertyWithServient,
  },
  observeproperty: {
    color: "Orange",
    title: "Observe",
    level: "properties",
    callback: null,
  },
  unobserveproperty: {
    color: "Red",
    title: "Unobserve",
    level: "properties",
    callback: null,
  },
  invokeaction: {
    color: "Orange",
    title: "Invoke",
    level: "actions",
    callback: null,
  },
  subscribeevent: {
    color: "Orange",
    title: "Subscribe",
    level: "events",
    callback: null,
  },
  unsubscribeevent: {
    color: "Red",
    title: "Unsubscribe",
    level: "events",
    callback: null,
  },
  readmultipleproperties: {
    color: "Green",
    title: "Read Multiple",
    level: "thing",
    callback: null,
  },
  readallproperties: {
    color: "Green",
    title: "Read All",
    level: "thing",
    callback: null,
  },
  writemultipleproperties: {
    color: "Blue",
    title: "Write Multiple",
    level: "thing",
    callback: null,
  },
  writeallproperties: {
    color: "Blue",
    title: "Write All",
    level: "thing",
    callback: null,
  },
  observeallproperties: {
    color: "Orange",
    title: "Observe All",
    level: "thing",
    callback: null,
  },
  unobserveallproperties: {
    color: "Red",
    title: "Unobserve All",
    level: "thing",
    callback: null,
  },
};

/**
 * Description of the function
 * @name InteractionFunction
 * @function
 * @param {Object} td The actual Thing Description
 * @param {String} propertyName The name of the Property
 * @param {any} content What should be written in case of e.g. a writeproperty call
 */
const parseContent = (
  propertyType: string | undefined,
  content: string
): any => {
  try {
    switch (propertyType) {
      case "boolean":
        return stripDoubleQuotes(content).toLowerCase() === "true";

      case "integer":
        const intVal = parseInt(stripDoubleQuotes(content), 10);
        if (isNaN(intVal)) {
          throw new Error(`Error on convert "${content}" to an integer.`);
        }
        return intVal;

      case "number":
        const numVal = parseFloat(stripDoubleQuotes(content));
        if (isNaN(numVal)) {
          throw new Error(`Error on convert "${content}" to a number.`);
        }
        return numVal;

      case "string":
        return stripDoubleQuotes(content);

      case "array":
        let temp = stripDoubleQuotes(content);
        if (Array.isArray(temp)) {
          return temp;
        }

        try {
          const parsedArray = JSON.parse(temp);
          if (Array.isArray(parsedArray)) {
            return parsedArray;
          }
        } catch {
          throw new Error(`Error on convert "${content}" to an array.`);
        }

      case "object":
        try {
          return JSON.parse(stripDoubleQuotes(content));
        } catch {
          throw new Error(`Error on convert "${content}" to an object.`);
        }

      default:
        throw new Error(`Unsupported type: "${propertyType}".`);
    }
  } catch (e) {
    console.error(`Failed to parse content for ${propertyType}:`, e);
  }
};

/** @type {InteractionFunction} */
async function readPropertyWithServient(
  td: ThingDescription,
  propertyName: string,
  options: {
    formIndex?: number;
    uriVariables?: object;
    data?: any;
  },
  valuePath: string
): Promise<{ result: string; err: Error | null }> {
  try {
    const thingFactory = await servient.start();
    const thing: ConsumedThing = await thingFactory.consume(td);

    const res = await thing.readProperty(propertyName, options);
    // @ts-expect-error always return the result even if the data schema doesn't fit
    res.ignoreValidation = true;
    const val = await res.value();

    if (valuePath === "") {
      return { result: JSON.stringify(val, null, 2), err: null };
    }

    if (val === null) {
      return { result: "null", err: null };
    }

    if (typeof val === "object" || Array.isArray(val)) {
      try {
        const key = JSONPointer.get(val, valuePath);

        if (key === undefined) {
          return {
            result: JSON.stringify(val, null, 2),
            err: null,
          };
        } else {
          return { result: JSON.stringify(key, null, 2), err: null };
        }
      } catch (e) {
        return {
          result: "",
          err: new Error(
            "Failed to get value with JSONPointer path: " + valuePath
          ),
        };
      }
    }

    return { result: JSON.stringify(val, null, 2), err: null };
  } catch (e) {
    console.debug(e);
    return {
      result: "",
      err: new Error(
        "Read property failed. Please check the hrefs on forms or the Settings section."
      ),
    };
  }
}

/** @type {InteractionFunction} */
async function writePropertyWithServient(
  td: ThingDescription,
  propertyName: string,
  content: string
): Promise<{ result: string; err: Error | null }> {
  try {
    if (
      td.properties === undefined ||
      td.properties[propertyName] === undefined
    ) {
      throw new Error(
        `Property "${propertyName}" not found in Thing Description.`
      );
    }
    const propertyType: DataSchemaType | undefined =
      td.properties[propertyName].type;

    const contentConverted = parseContent(propertyType, content);

    const thingFactory = await servient.start();
    const thing: ConsumedThing = await thingFactory.consume(td);

    // no return value - only exception on error
    await thing.writeProperty(propertyName, contentConverted);

    return {
      result: `Successfully wrote ${
        JSON.stringify(contentConverted).length > 50
          ? JSON.stringify(contentConverted).slice(0, 50) + "..."
          : JSON.stringify(contentConverted)
      } to '${propertyName}'.`,
      err: null,
    };
  } catch (e) {
    console.debug(e);
    return { result: "", err: e as Error };
  }
}

export {
  formConfigurations,
  readPropertyWithServient,
  writePropertyWithServient,
};
