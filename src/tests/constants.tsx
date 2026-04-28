/********************************************************************************
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import { vi } from "vitest";
export const THING_DESCRIPTION_LAMP_JSON = {
  "@context": "https://www.w3.org/ns/wot-next/td",
  id: "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06",
  title: "MyLampThing",
  securityDefinitions: {
    basic_sc: { scheme: "basic", in: "header" },
  },
  security: "basic_sc",
  properties: {
    status: {
      type: "string",
      forms: [{ href: "https://mylamp.example.com/status" }],
    },
  },
  actions: {
    toggle: {
      forms: [{ href: "https://mylamp.example.com/toggle" }],
    },
  },
  events: {
    overheating: {
      data: { type: "string" },
      forms: [
        {
          href: "https://mylamp.example.com/oh",
          subprotocol: "longpoll",
        },
      ],
    },
  },
};

export const THING_DESCRIPTION_LAMP_V_STRING = JSON.stringify(
  THING_DESCRIPTION_LAMP_JSON,
  null,
  2
);

export const createContextValue = (
  overrides: Partial<IEdiTDorContext> = {}
): IEdiTDorContext => ({
  offlineTD: "",
  isValidJSON: true,
  parsedTD: {},
  isModified: false,
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
  updateOfflineTD: vi.fn(),
  updateIsModified: vi.fn(),
  setFileHandle: vi.fn(),
  removeForm: vi.fn(),
  addForm: vi.fn(),
  removeLink: vi.fn(),
  removeOneOfAKindReducer: vi.fn(),
  addLinkedTd: vi.fn(),
  updateLinkedTd: vi.fn(),
  updateValidationMessage: vi.fn(),
  updateNorthboundConnection: vi.fn(),
  updateContributeCatalog: vi.fn(),
  ...overrides,
});
