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
import { Trash2, Copy } from "react-feather";
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

const alreadyRenderedKeys = ["title", "forms", "description"];

const Property: React.FC<any> = (props) => {
  const context = useContext(ediTDorContext);
  const [isExpanded, setIsExpanded] = useState(false);

  const addFormDialog = useRef<{ openModal: () => void }>(null);

  const property = props.prop;
  const forms = separateForms(structuredClone(property.forms));

  const attributeListObject = buildAttributeListObject(
    { name: props.propName },
    property,
    alreadyRenderedKeys
  );

  const handleDeletePropertyClicked = () => {
    context.removeOneOfAKindReducer("properties", props.propName);
  };

  const handleCopyProperty = () => {
    try {
      const { updatedTD, newName } = copyAffordance({
        parsedTD: context.parsedTD,
        section: "properties",
        originalName: props.propName,
        affordance: property,
      });

      context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));
      setIsExpanded(true);

      setTimeout(() => {
        document
          .getElementById(`property-${newName}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <details
      id={`property-${props.propName}`}
      className="mb-1"
      open={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <summary
        className={`flex cursor-pointer items-center rounded-t-lg pl-2 text-xl font-bold text-white ${
          isExpanded ? "bg-gray-500" : ""
        }`}
      >
        <h3 className="flex-grow px-2">{property.title ?? props.propName}</h3>

        {isExpanded && (
          <>
            <button
              className="flex h-10 w-10 items-center justify-center self-stretch bg-gray-400"
              title="Copy property"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyProperty();
              }}
            >
              <Copy size={16} color="white" />
            </button>

            <button
              className="flex h-10 w-10 items-center justify-center self-stretch rounded-bl-lg rounded-tr-lg bg-gray-400"
              title="Delete property"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeletePropertyClicked();
              }}
            >
              <Trash2 size={16} color="white" />
            </button>
          </>
        )}
      </summary>

      <div className="mb-4 rounded-b-lg bg-gray-500 px-2 pb-4">
        {property.description && (
          <div className="px-2 pb-2 text-lg text-gray-400">
            {property.description}
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
          interaction={property}
          interactionName={props.propName}
          ref={addFormDialog}
        />

        {forms.map((form, i) => (
          <Form
            key={`${i}-${form.href}`}
            propName={props.propName}
            form={form}
            interactionType="property"
          />
        ))}
      </div>
    </details>
  );
};

export default Property;
