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
import React, { useContext, useState, useRef } from "react";
import ediTDorContext from "../../../context/ediTDorContext";
import {
  buildAttributeListObject,
  separateForms,
} from "../../../utils/tdOperations";
import InfoIconWrapper from "../../base/InfoIconWrapper";
import { getFormsTooltipContent } from "../../../utils/TooltipMapper";
import Form from "./Form";
import AddFormDialog from "../../Dialogs/AddFormDialog";
import AddFormElement from "../base/AddFormElement";
import { copyAffordance } from "../../../utils/copyAffordance";
import AffordanceButtons from "./AffordanceButtons";

interface IProperty {
  prop: {
    title: string;
    forms: Array<{
      href: string;
      contentType?: string;
      op?: string | string[];
      [key: string]: any;
    }>;
    description?: string;
    [key: string]: any;
  };
  propName: string;
}

const alreadyRenderedKeys = ["title", "forms", "description"];

const Property: React.FC<IProperty> = ({ prop, propName }) => {
  const context = useContext(ediTDorContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const addFormDialog = useRef<{ openModal: () => void }>(null);
  const forms = separateForms(structuredClone(prop.forms));
  const attributeListObject = buildAttributeListObject(
    { name: propName },
    prop,
    alreadyRenderedKeys
  );
  const handleDeleteProperty = () => {
    context.removeOneOfAKindReducer("properties", propName);
  };
  const handleCopyProperty = () => {
    const { updatedTD, newName } = copyAffordance({
      parsedTD: context.parsedTD,
      section: "properties",
      originalName: propName,
      affordance: prop,
    });
    context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));
    setIsExpanded(true);
    setTimeout(() => {
      document
        .getElementById(`property-${newName}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <details
      id={`property-${propName}`}
      className={`mb-2 ${isExpanded ? "overflow-hidden rounded-lg bg-gray-500" : ""}`}
      open={isExpanded}
      onToggle={(e) => setIsExpanded(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-center py-1 pl-2 text-xl font-bold text-white">
        <h3 className="flex-grow px-2">{prop.title ?? propName}</h3>
        {isExpanded && (
          <AffordanceButtons
            copyTitle="Copy property"
            deleteTitle="Delete property"
            onCopy={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopyProperty();
            }}
            onDelete={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDeleteProperty();
            }}
          />
        )}
      </summary>
      <div className="px-2 pb-4">
        {prop.description && (
          <div className="px-2 pb-2 text-lg text-gray-400">
            {prop.description}
          </div>
        )}
        <ul className="list-disc pl-6 text-base text-gray-300">
          {Object.entries(attributeListObject).map(([k, v]) => (
            <li key={k}>
              {k}: {JSON.stringify(v)}
            </li>
          ))}
        </ul>
        <InfoIconWrapper tooltip={getFormsTooltipContent()} id="properties">
          <h4 className="text-lg font-bold text-white">Forms</h4>
        </InfoIconWrapper>
        <AddFormElement onClick={() => addFormDialog.current?.openModal()} />
        <AddFormDialog
          type="property"
          interaction={prop}
          interactionName={propName}
          ref={addFormDialog}
        />
        {forms.map((form, i) => (
          <Form
            key={`${i}-${form.href}`}
            propName={propName}
            form={form}
            interactionType="property"
          />
        ))}
      </div>
    </details>
  );
};

export default Property;
