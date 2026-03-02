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
import AddFormDialog from "../../Dialogs/AddFormDialog";
import InfoIconWrapper from "../../base/InfoIconWrapper";
import { getFormsTooltipContent } from "../../../utils/TooltipMapper";
import Form from "./Form";
import AddFormElement from "../base/AddFormElement";
import { copyAffordance } from "../../../utils/copyAffordance";
import AffordanceButtons from "./AffordanceButtons";
const alreadyRenderedKeys = ["title", "forms", "description"];

interface IAction {
  action: any;
  actionName: string;
}
const Action: React.FC<IAction> = ({ action, actionName }) => {
  const context = useContext(ediTDorContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const addFormDialog = useRef<{ openModal: () => void }>(null);
  const forms = separateForms(action.forms);
  const attributeListObject = buildAttributeListObject(
    { name: actionName },
    action,
    alreadyRenderedKeys
  );
  const handleDelete = () => {
    context.removeOneOfAKindReducer("actions", actionName);
  };
  const handleCopy = () => {
    const { updatedTD, newName } = copyAffordance({
      parsedTD: context.parsedTD,
      section: "actions",
      originalName: actionName,
      affordance: action,
    });
    context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));
    setIsExpanded(true);
    setTimeout(() => {
      document
        .getElementById(`action-${newName}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <details
      id={`action-${actionName}`}
      className={`mb-2 ${isExpanded ? "overflow-hidden rounded-lg bg-gray-500" : ""}`}
      open={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <summary className="flex cursor-pointer items-center py-1 pl-2 text-xl font-bold text-white">
        <h3 className="flex-grow px-2">{action.title ?? actionName}</h3>

        {isExpanded && (
          <AffordanceButtons
            copyTitle="Copy action"
            deleteTitle="Delete action"
            onCopy={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopy();
            }}
            onDelete={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDelete();
            }}
          />
        )}
      </summary>

      <div className="px-2 pb-4">
        {action.description && (
          <div className="px-2 pb-2 text-lg text-gray-400">
            {action.description}
          </div>
        )}

        <ul className="list-disc pl-6 text-base text-gray-300">
          {Object.entries(attributeListObject).map(([k, v]) => (
            <li key={k}>
              {k}: {JSON.stringify(v)}
            </li>
          ))}
        </ul>

        <InfoIconWrapper tooltip={getFormsTooltipContent()} id="actions">
          <h4 className="text-lg font-bold text-white">Forms</h4>
        </InfoIconWrapper>

        <AddFormElement onClick={() => addFormDialog.current?.openModal()} />

        <AddFormDialog
          type="action"
          interaction={action}
          interactionName={actionName}
          ref={addFormDialog}
        />

        {forms.map((form, i) => (
          <Form
            key={`${i}-${form?.href ?? "nohref"}`}
            form={form}
            propName={actionName}
            interactionType="action"
          />
        ))}
      </div>
    </details>
  );
};

export default Action;
