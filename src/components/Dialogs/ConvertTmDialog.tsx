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
import React, {
  forwardRef,
  useContext,
  useEffect,
  useState,
  useImperativeHandle,
} from "react";
import ReactDOM from "react-dom";
import ediTDorContext from "../../context/ediTDorContext";
import DialogTemplate from "./DialogTemplate";
import {
  processConversionTMtoTD,
  extractPlaceholders,
  isVersionValid,
} from "../../services/operations";
import TmInputForm from "../base/TmInputForm";
import TextField from "../base/TextField";

export interface ConvertTmDialogRef {
  openModal: () => void;
  close: () => void;
}

const ConvertTmDialog = forwardRef<ConvertTmDialogRef>((props, ref) => {
  const context: IEdiTDorContext = useContext(ediTDorContext);
  const td: string = context.offlineTD;
  const [htmlInputs, setHtmlInputs] = useState<JSX.Element[]>([]);
  const [display, setDisplay] = useState<boolean>(() => {
    return false;
  });
  const [affordanceElements, setAffordanceElements] = useState<JSX.Element[]>(
    []
  );
  const [placeholderValues, setPlaceholderValues] = useState<
    Record<string, string>
  >({});

  const [validVersion, setValidVersion] = useState<boolean>(false);
  const [versionInput, setVersionInput] = useState<string>("");

  useEffect(() => {
    setValidVersion(isVersionValid(context.parsedTD));
  }, [context.parsedTD]);

  useEffect(() => {
    setHtmlInputs(createHtmlInputs(context.offlineTD));
    setAffordanceElements(createAffordanceElements(context.offlineTD));
  }, [context.offlineTD]);

  useEffect(() => {
    if (td) {
      const placeholders = extractPlaceholders(td);
      const initialValues = placeholders.reduce<Record<string, string>>(
        (acc, key) => {
          acc[key] = "";
          return acc;
        },
        {}
      );
      setPlaceholderValues(initialValues);
    }
  }, [td]);

  useImperativeHandle(ref, () => ({
    openModal: () => setDisplay(true),
    close: () => setDisplay(false),
  }));

  const handleFieldChange = (placeholder: string, value: string) => {
    setPlaceholderValues((prev) => ({
      ...prev,
      [placeholder]: value,
    }));
  };
  const handleGenerateTd = () => {
    const selections = getSelectedAffordances(affordanceElements);

    const newTD = processConversionTMtoTD(
      context.offlineTD,
      placeholderValues,
      selections.properties,
      selections.actions,
      selections.events,
      versionInput
    );
    const resultJson = JSON.stringify(newTD, null, 2);
    localStorage.setItem("td", resultJson);
    window.open(
      `${window.location.origin + window.location.pathname}?localstorage`,
      "_blank"
    );
  };

  const handleVersionInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = e.target.value;
    const trimmedValue = value.trim();
    setVersionInput(trimmedValue);
  };

  if (!display) return null;

  if (display) {
    return ReactDOM.createPortal(
      <DialogTemplate
        onHandleEventLeftButton={() => setDisplay(false)}
        onHandleEventRightButton={handleGenerateTd}
        rightButton={"Generate TD"}
        title={"Generate TD From TM"}
        description={"Please provide values to switch the placeholders with."}
      >
        <>
          <TmInputForm
            inputValues={placeholderValues}
            onValueChange={handleFieldChange}
          />

          {!validVersion && (
            <TextField
              label="TD instance version"
              id="instance"
              autoFocus={true}
              onChange={handleVersionInputChange}
              placeholder="ex: 1.0.0"
              value={versionInput}
              helperText="The Thing Model contains a version without instance key and corresponding value. If you leave this field empty it will automatic generate a instance value."
            ></TextField>
          )}
          <h2 className="pb-2 pt-4 text-gray-400">
            Select/unselect the interaction affordances you would like to see in
            the new TD.
          </h2>

          <div className="affordances-container">{affordanceElements}</div>
        </>
      </DialogTemplate>,
      document.getElementById("modal-root") as HTMLElement
    );
  }

  return null;
});

function getSelectedAffordances(elements: JSX.Element[]) {
  const result = {
    properties: [] as string[],
    actions: [] as string[],
    events: [] as string[],
  };

  elements.forEach((element) => {
    if (element.props.className.includes("form-checkbox")) {
      const checkbox = document.getElementById(
        element.props.children[0].props.id
      ) as HTMLInputElement | null;
      if (checkbox?.checked) {
        const [type, name] = element.key?.toString().split("/") ?? [];

        if (type === "properties") result.properties.push(name);
        else if (type === "actions") result.actions.push(name);
        else if (type === "events") result.events.push(name);
      }
    }
  });

  return result;
}

// Create affordance element remains similar to your original implementation
function createAffordanceElements(tmContent: string): JSX.Element[] {
  try {
    if (!tmContent) return [];
    const parsed = JSON.parse(tmContent);
    const { properties, actions, events, requiredFields } =
      extractAffordances(parsed);

    const propertyElements = createAffordanceHtml(
      "properties",
      properties,
      requiredFields
    );
    const actionElements = createAffordanceHtml(
      "actions",
      actions,
      requiredFields
    );
    const eventElements = createAffordanceHtml(
      "events",
      events,
      requiredFields
    );

    return [...propertyElements, ...actionElements, ...eventElements];
  } catch (e) {
    console.error("Error creating affordance elements:", e);
    return [];
  }
}

const createHtmlInputs = (td: string): JSX.Element[] => {
  try {
    let htmlProperties: JSX.Element[] = [];
    let htmlActions: JSX.Element[] = [];
    let htmlEvents: JSX.Element[] = [];

    try {
      const parsed = JSON.parse(td);

      const { properties, actions, events, requiredFields } =
        extractAffordances(parsed);

      htmlProperties = createAffordanceHtml(
        "properties",
        properties,
        requiredFields
      );
      htmlActions = createAffordanceHtml("actions", actions, requiredFields);
      htmlEvents = createAffordanceHtml("events", events, requiredFields);
    } catch (ignored) {}

    return [...htmlProperties, ...htmlActions, ...htmlEvents];
  } catch (e) {
    console.error("Error creating HTML inputs:", e);
    return [];
  }
};

function createAffordanceHtml(
  affName: "properties" | "actions" | "events",
  affContainer: string[],
  requiredFields: { [k: string]: string[] }
): JSX.Element[] {
  return affContainer.map((aff) => {
    const required = requiredFields[affName].includes(aff);
    return (
      <div key={`${affName}/${aff}`} className="form-checkbox py-1 pl-2">
        <input
          id={`${affName}/${aff}`}
          className="form-checkbox-input"
          type="checkbox"
          value={`#${affName}/${aff}`}
          disabled={required}
          defaultChecked={true}
          title={required ? "This field is required by the TM." : ""}
          data-interaction={affName}
        />
        <label
          className="form-checkbox-label pl-2"
          htmlFor={`${affName}/${aff}`}
        >{`#${affName}/${aff}`}</label>
      </div>
    );
  });
}

function extractAffordances(parsed: any) {
  const properties = Object.keys(parsed["properties"] || {});
  const actions = Object.keys(parsed["actions"] || {});
  const events = Object.keys(parsed["events"] || {});
  const requiredFields = { properties: [], actions: [], events: [] };

  if (parsed["tm:required"]) {
    for (const field of parsed["tm:required"]) {
      if (field.startsWith("#properties/"))
        // @ts-ignore
        requiredFields["properties"].push(field.split("/")[1]);
      else if (field.startsWith("#actions/"))
        // @ts-ignore
        requiredFields["actions"].push(field.split("/")[1]);
      else if (field.startsWith("#events/"))
        // @ts-ignore
        requiredFields["events"].push(field.split("/")[1]);
    }
  }
  return { properties, actions, events, requiredFields };
}

ConvertTmDialog.displayName = "ConvertTmDialog";
export default ConvertTmDialog;
