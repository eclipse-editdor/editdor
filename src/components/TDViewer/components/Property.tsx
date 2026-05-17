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
import React, { useContext, useRef } from "react";
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
import AffordanceButtons from "./AffordanceButtons";
import type { IInteractionAffordance } from "../../../types/form";
import { useCopiedAffordanceFocus } from "../../../hooks/useCopiedAffordanceFocus";

interface IProperty {
  prop: IInteractionAffordance;
  propName: string;
  copiedToken?: number;
  onCopy: () => void;
}

const alreadyRenderedKeys = ["title", "forms", "description"];

const Property: React.FC<IProperty> = ({
  prop,
  propName,
  copiedToken,
  onCopy,
}) => {
  const context = useContext(ediTDorContext);
  const addFormDialog = useRef<{ openModal: () => void; close: () => void }>(
    null
  );
  const { containerRef, isExpanded, isHighlighted, setIsExpanded } =
    useCopiedAffordanceFocus({ copiedToken });
  const forms = separateForms(structuredClone(prop.forms));
  const attributeListObject = buildAttributeListObject(
    { name: propName },
    prop,
    alreadyRenderedKeys
  );
  const handleDeleteProperty = () => {
    context.removeOneOfAKindReducer("properties", propName);
  };

  return (
    <details
      ref={containerRef}
      id={`property-${propName}`}
      className={`mb-2 rounded-lg transition-all ${isExpanded ? "overflow-hidden bg-gray-500" : ""} ${isHighlighted ? "border-2 border-green-400 ring-2 ring-green-300/70" : ""}`}
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
              onCopy();
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
