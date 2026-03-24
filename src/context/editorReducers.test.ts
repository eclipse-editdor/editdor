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
import { ADD_FORM_TO_TD, ADD_LINKED_TD } from "./GlobalState";
import { editdorReducer } from "./editorReducers";

const baseState: EditorState = {
  offlineTD: "",
  isModified: false,
  isValidJSON: true,
  parsedTD: {},
  name: "",
  fileHandle: null,
  linkedTd: undefined,
  validationMessage: {
    report: {
      json: null,
      schema: null,
      defaults: null,
      jsonld: null,
      additional: null,
    },
    details: {
      enumConst: null,
      propItems: null,
      security: null,
      propUniqueness: null,
      multiLangConsistency: null,
      linksRelTypeCount: null,
      readWriteOnly: null,
      uriVariableSecurity: null,
    },
    detailComments: {
      enumConst: null,
      propItems: null,
      security: null,
      propUniqueness: null,
      multiLangConsistency: null,
      linksRelTypeCount: null,
      readWriteOnly: null,
      uriVariableSecurity: null,
    },
    validationErrors: {
      json: "",
      schema: "",
    },
    customMessage: "",
  },
  northboundConnection: {
    message: "",
    northboundTd: {},
  },
  contributeCatalog: {
    model: "",
    author: "",
    manufacturer: "",
    license: "",
    copyrightYear: "",
    holder: "",
    tmCatalogEndpoint: "",
    nameRepository: "",
    dynamicValues: {},
  },
};

describe("addLinkedTd", () => {
  test("should create linkedTd when it does not exist", () => {
    const linkedTd = {
      SensorA: {
        title: "Sensor A",
      },
    };

    const nextState = editdorReducer(
      {
        ...baseState,
        linkedTd: undefined,
      },
      {
        type: ADD_LINKED_TD,
        linkedTd,
      }
    );

    expect(nextState.linkedTd).toEqual(linkedTd);
  });

  test("should merge linkedTd when linkedTd already exists", () => {
    const existingLinkedTd = {
      SensorA: {
        title: "Sensor A",
      },
    };

    const newLinkedTd = {
      SensorB: {
        title: "Sensor B",
      },
    };

    const nextState = editdorReducer(
      {
        ...baseState,
        linkedTd: existingLinkedTd,
      },
      {
        type: ADD_LINKED_TD,
        linkedTd: newLinkedTd,
      }
    );

    expect(nextState.linkedTd).toEqual({
      SensorA: {
        title: "Sensor A",
      },
      SensorB: {
        title: "Sensor B",
      },
    });
  });
});

describe("addFormReducer", () => {
  test("should creates td.forms when adding a thing form and forms does not exist", () => {
    const form = { href: "/thing", op: "readallproperties" };

    const nextState = editdorReducer(
      {
        ...baseState,
        parsedTD: {
          title: "Example Thing",
        },
      },
      {
        type: ADD_FORM_TO_TD,
        level: "thing",
        interactionName: "",
        form,
      }
    );

    expect(nextState.parsedTD).toMatchObject({
      title: "Example Thing",
      forms: [form],
    });
    expect(JSON.parse(nextState.offlineTD)).toMatchObject({
      title: "Example Thing",
      forms: [form],
    });
  });

  test("should appends to td.forms when thing forms already exists", () => {
    const existingForm = { href: "/existing", op: "readallproperties" };
    const newForm = { href: "/new", op: "writeallproperties" };

    const nextState = editdorReducer(
      {
        ...baseState,
        parsedTD: {
          title: "Example Thing",
          forms: [existingForm],
        },
      },
      {
        type: ADD_FORM_TO_TD,
        level: "thing",
        interactionName: "",
        form: newForm,
      }
    );

    expect(nextState.parsedTD).toMatchObject({
      forms: [existingForm, newForm],
    });
  });

  test("should creates interaction forms when adding an interaction form and forms does not exist", () => {
    const form = { href: "/temperature", op: "readproperty" };

    const nextState = editdorReducer(
      {
        ...baseState,
        parsedTD: {
          properties: {
            temperature: {
              title: "temperature",
            },
          },
        },
      },
      {
        type: ADD_FORM_TO_TD,
        level: "properties",
        interactionName: "temperature",
        form,
      }
    );

    expect(nextState.parsedTD).toMatchObject({
      properties: {
        temperature: {
          title: "temperature",
          forms: [form],
        },
      },
    });
  });
  test("should return the same state when JSON is invalid", () => {
    const form = { href: "/thing", op: "readallproperties" };
    const state = {
      ...baseState,
      isValidJSON: false,
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "thing",
      interactionName: "",
      form,
    });

    expect(nextState).toBe(state);
  });

  test("should return the same state when td.forms exists but is not an array", () => {
    const form = { href: "/thing", op: "readallproperties" };
    const state = {
      ...baseState,
      parsedTD: {
        title: "Example Thing",
        forms: { href: "/bad" },
      },
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "thing",
      interactionName: "",
      form,
    });

    expect(nextState).toBe(state);
  });

  test("should append to interaction.forms when it already exists", () => {
    const existingForm = { href: "/temperature/1", op: "readproperty" };
    const newForm = { href: "/temperature/2", op: "observeproperty" };

    const nextState = editdorReducer(
      {
        ...baseState,
        parsedTD: {
          properties: {
            temperature: {
              title: "temperature",
              forms: [existingForm],
            },
          },
        },
      },
      {
        type: ADD_FORM_TO_TD,
        level: "properties",
        interactionName: "temperature",
        form: newForm,
      }
    );

    expect(nextState.parsedTD).toMatchObject({
      properties: {
        temperature: {
          title: "temperature",
          forms: [existingForm, newForm],
        },
      },
    });

    expect(JSON.parse(nextState.offlineTD)).toMatchObject({
      properties: {
        temperature: {
          title: "temperature",
          forms: [existingForm, newForm],
        },
      },
    });
  });

  test("should return the same state when interaction type does not exist", () => {
    const form = { href: "/temperature", op: "readproperty" };
    const state = {
      ...baseState,
      parsedTD: {},
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "properties",
      interactionName: "temperature",
      form,
    });

    expect(nextState).toBe(state);
  });

  test("should return the same state when interaction does not exist", () => {
    const form = { href: "/temperature", op: "readproperty" };
    const state = {
      ...baseState,
      parsedTD: {
        properties: {},
      },
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "properties",
      interactionName: "temperature",
      form,
    });

    expect(nextState).toBe(state);
  });

  test("should return the same state when interaction.forms exists but is not an array", () => {
    const form = { href: "/temperature", op: "readproperty" };
    const state = {
      ...baseState,
      parsedTD: {
        properties: {
          temperature: {
            title: "temperature",
            forms: { href: "/bad" },
          },
        },
      },
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "properties",
      interactionName: "temperature",
      form,
    });

    expect(nextState).toBe(state);
  });

  test("should not mutate the previous parsedTD object", () => {
    const originalParsedTD = {
      properties: {
        temperature: {
          title: "temperature",
        },
      },
    };
    const form = { href: "/temperature", op: "readproperty" };

    const state = {
      ...baseState,
      parsedTD: originalParsedTD,
    };

    const nextState = editdorReducer(state, {
      type: ADD_FORM_TO_TD,
      level: "properties",
      interactionName: "temperature",
      form,
    });

    expect(originalParsedTD).toEqual({
      properties: {
        temperature: {
          title: "temperature",
        },
      },
    });

    expect(nextState.parsedTD).toMatchObject({
      properties: {
        temperature: {
          title: "temperature",
          forms: [form],
        },
      },
    });
  });
});
