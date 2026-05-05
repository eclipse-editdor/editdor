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
import React from "react";
//  Default
const defaultContext: IEdiTDorContext = {
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

  updateOfflineTD: () => {},
  updateIsModified: () => {},
  setFileHandle: () => {},
  removeForm: () => {},
  addForm: () => {},
  removeLink: () => {},
  removeOneOfAKindReducer: () => {},
  addLinkedTd: () => {},
  updateLinkedTd: () => {},
  updateValidationMessage: () => {},
  updateNorthboundConnection: () => {},
  updateContributeCatalog: () => {},
};

const ediTDorContext = React.createContext<IEdiTDorContext>(defaultContext);

export default ediTDorContext;
