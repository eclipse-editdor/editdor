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
import AddFormDialog from "../../Dialogs/AddFormDialog";
import InfoIconWrapper from "../../base/InfoIconWrapper";
import { getFormsTooltipContent } from "../../../utils/TooltipMapper";
import Form from "./Form";
import AddFormElement from "../base/AddFormElement";
import AffordanceButtons from "./AffordanceButtons";
import type { IInteractionAffordance } from "../../../types/form";
import { useCopiedAffordanceFocus } from "../../../hooks/useCopiedAffordanceFocus";
const alreadyRenderedKeys = ["title", "forms", "description"];

interface IAction {
  action: IInteractionAffordance;
  actionName: string;
  copiedToken?: number;
  onCopy: () => void;
}
const Action: React.FC<IAction> = ({
  action,
  actionName,
  copiedToken,
  onCopy,
}) => {
  const context = useContext(ediTDorContext);
  const addFormDialog = useRef<{ openModal: () => void; close: () => void }>(
    null
  );
  const { containerRef, isExpanded, isHighlighted, setIsExpanded } =
    useCopiedAffordanceFocus({ copiedToken });
  const forms = separateForms(action.forms);
  const attributeListObject = buildAttributeListObject(
    { name: actionName },
    action,
    alreadyRenderedKeys
  );
  const handleDelete = () => {
    context.removeOneOfAKindReducer("actions", actionName);
  };

  return (
    <details
      ref={containerRef}
      id={`action-${actionName}`}
      className={`mb-2 rounded-lg transition-all ${isExpanded ? "overflow-hidden bg-gray-500" : ""} ${isHighlighted ? "border-2 border-green-400 ring-2 ring-green-300/70" : ""}`}
      open={isExpanded}
      onToggle={(e) => setIsExpanded(e.currentTarget.open)}
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
              onCopy();
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
            key={`${i}-${form?.href}`}
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
