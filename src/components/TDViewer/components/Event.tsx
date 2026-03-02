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
interface IEvent {
  event: any;
  eventName: string;
}
const Event: React.FC<IEvent> = ({ event, eventName }) => {
  const context = useContext(ediTDorContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const addFormDialog = useRef<{ openModal: () => void }>(null);
  const forms = separateForms(event.forms);
  const attributeListObject = buildAttributeListObject(
    { name: eventName },
    event,
    alreadyRenderedKeys
  );
  const handleDelete = () => {
    context.removeOneOfAKindReducer("events", eventName);
  };
  const handleCopy = () => {
    const { updatedTD, newName } = copyAffordance({
      parsedTD: context.parsedTD,
      section: "events",
      originalName: eventName,
      affordance: event,
    });
    context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));
    setIsExpanded(true);
    setTimeout(() => {
      document
        .getElementById(`event-${newName}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  return (
    <details
      id={`event-${eventName}`}
      className={`mb-2 ${isExpanded ? "overflow-hidden rounded-lg bg-gray-500" : ""}`}
      open={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <summary className="flex cursor-pointer items-center py-1 pl-2 text-xl font-bold text-white">
        <div className="flex-grow px-2">{event.title ?? eventName}</div>
        {isExpanded && (
          <AffordanceButtons
            copyTitle="Copy event"
            deleteTitle="Delete event"
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
        {event.description && (
          <div className="px-2 pb-2 text-lg text-gray-400">
            {event.description}
          </div>
        )}
        <ul className="list-disc pl-6 text-base text-gray-300">
          {Object.entries(attributeListObject).map(([k, v]) => (
            <li key={k}>
              {k}: {JSON.stringify(v)}
            </li>
          ))}
        </ul>
        <InfoIconWrapper tooltip={getFormsTooltipContent()} id="events">
          <h4 className="text-lg font-bold text-white">Forms</h4>
        </InfoIconWrapper>
        <AddFormElement onClick={() => addFormDialog.current?.openModal()} />
        <AddFormDialog
          type="event"
          interaction={event}
          interactionName={eventName}
          ref={addFormDialog}
        />
        {forms.map((form, i) => (
          <Form
            key={`${i}-${form.href}`}
            form={form}
            propName={eventName}
            interactionType="event"
          />
        ))}
      </div>
    </details>
  );
};

export default Event;
