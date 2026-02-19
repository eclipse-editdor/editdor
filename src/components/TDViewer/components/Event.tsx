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
import AddFormDialog from "../../Dialogs/AddFormDialog";
import InfoIconWrapper from "../../base/InfoIconWrapper";
import { getFormsTooltipContent } from "../../../utils/TooltipMapper";
import Form from "./Form";
import AddFormElement from "../base/AddFormElement";
import { copyAffordance } from "../../../utils/copyAffordance";

const alreadyRenderedKeys = ["title", "forms", "description"];

const Event: React.FC<any> = (props) => {
  const context = useContext(ediTDorContext);
  const [isExpanded, setIsExpanded] = useState(false);

  const addFormDialog = useRef<{ openModal: () => void }>(null);
  const handleOpenAddFormDialog = () => {
    addFormDialog.current?.openModal();
  };

  if (
    Object.keys(props.event).length === 0 &&
    props.event.constructor !== Object
  ) {
    return (
      <div className="text-3xl text-white">
        Event could not be rendered because mandatory fields are missing.
      </div>
    );
  }

  const event = props.event;
  const forms = separateForms(props.event.forms);

  const attributeListObject = buildAttributeListObject(
    { name: props.eventName },
    props.event,
    alreadyRenderedKeys
  );

  const attributes = Object.keys(attributeListObject).map((x) => (
    <li key={x}>
      {x} : {JSON.stringify(attributeListObject[x])}
    </li>
  ));

  const handleDeleteEventClicked = () => {
    context.removeOneOfAKindReducer("events", props.eventName);
  };

  const handleCopyEvent = () => {
    try {
      const { updatedTD, newName } = copyAffordance({
        parsedTD: context.parsedTD,
        section: "events",
        originalName: props.eventName,
        affordance: event,
      });

      context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));

      setIsExpanded(true);

      setTimeout(() => {
        document
          .getElementById(`event-${newName}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <details
      id={`event-${props.eventName}`}
      className="mb-1"
      open={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    >
      <summary
        className={`flex cursor-pointer items-center rounded-t-lg pl-2 text-xl font-bold text-white ${
          isExpanded ? "bg-gray-500" : ""
        }`}
      >
        <div className="flex-grow px-2">
          {event.title ?? props.eventName}
        </div>

        {isExpanded && (
          <>
            {/* COPY BUTTON */}
            <button
              className="flex h-10 w-10 items-center justify-center self-stretch bg-gray-400 text-base"
              title="Copy event"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyEvent();
              }}
            >
              <Copy size={16} color="white" />
            </button>

            {/* DELETE BUTTON */}
            <button
              className="flex h-10 w-10 items-center justify-center self-stretch rounded-bl-md rounded-tr-md bg-gray-400 text-base"
              title="Delete event"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteEventClicked();
              }}
            >
              <Trash2 size={16} color="white" />
            </button>
          </>
        )}
      </summary>

      <div className="mb-4 rounded-b-lg bg-gray-500 px-2 pb-4">
        {event.description && (
          <div className="px-2 pb-2 text-lg text-gray-400">
            {event.description}
          </div>
        )}

        <ul className="list-disc pl-6 text-base text-gray-300">
          {attributes}
        </ul>

        <div className="flex items-center justify-start pb-2 pt-2">
          <InfoIconWrapper
            className="flex-grow"
            tooltip={getFormsTooltipContent()}
            id="events"
          >
            <h4 className="pr-1 text-lg font-bold text-white">Forms</h4>
          </InfoIconWrapper>
        </div>

        <AddFormElement onClick={handleOpenAddFormDialog} />
        <AddFormDialog
          type="event"
          interaction={event}
          interactionName={props.eventName}
          ref={addFormDialog}
        />

        {forms.map((form, i) => (
          <Form
            key={`${i}-${form.href}`}
            form={form}
            propName={props.eventName}
            interactionType="event"
          />
        ))}
      </div>
    </details>
  );
};

export default Event;
