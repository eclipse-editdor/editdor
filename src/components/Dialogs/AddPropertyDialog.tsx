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
  useImperativeHandle,
} from "react";
import ReactDOM from "react-dom";
import ediTDorContext from "../../context/ediTDorContext";
import Checkbox from "../base/Checkbox";
import TextArea from "../base/TextArea";
import TextField from "../base/TextField";
import Dropdown from "../base/Dropdown";

import DialogTemplate from "./DialogTemplate";

const NO_TYPE = "undefined";

export interface IAddPropertyDialogRef {
  openModal: () => void;
  close?: () => void;
}

interface IProperty {
  title: string;
  description?: string;
  type?: string;
  observable?: boolean;
  readOnly?: boolean;
  forms: any[];
  items?: Record<string, any>;
  properties?: Record<string, any>;
}

export const AddPropertyDialog = forwardRef<IAddPropertyDialogRef, {}>(
  (_, ref) => {
    const context = useContext(ediTDorContext);
    const [display, setDisplay] = React.useState<boolean>(() => {
      return false;
    });

    const type = "property";
    const key = "properties";
    const name = type && type[0].toUpperCase() + type.slice(1);

    useEffect(() => {}, [display, context]);

    useImperativeHandle(ref, () => {
      return {
        openModal: () => open(),
        close: () => close(),
      };
    });

    const open = () => {
      setDisplay(true);
    };

    const close = () => {
      setDisplay(false);
    };

    const children = (
      <>
        <TextField
          id={`${type}-title`}
          label="Title"
          placeholder={`${name} Title`}
          autoFocus={true}
          onChange={() => clearErrorMessage()}
        />
        <TextArea
          id={`${type}-description`}
          label="Description"
          placeholder={`A short description about the new ${name}...`}
        />
        <Dropdown
          id={`${type}-type`}
          label="Type"
          options={[
            NO_TYPE,
            "number",
            "integer",
            "boolean",
            "string",
            "object",
            "array",
          ]}
        />
        <div className="h-2"></div>
        <label className="pl-3 text-sm font-medium text-gray-400">
          Additional:
        </label>
        <div id="additional" className="rounded-md bg-gray-600 p-1">
          <Checkbox id={`${type}-readOnly`} label="Read Only" />
          <Checkbox id={`${type}-observable`} label="Observable" />
        </div>
      </>
    );

    const onAddProperty = () => {
      if (!context.isValidJSON) {
        showErrorMessage(`Can't add Action. TD is malformed.`);
        return;
      }

      const property: IProperty = {
        title: (document.getElementById(`${type}-title`) as HTMLInputElement)
          .value,
        observable: (
          document.getElementById(`${type}-observable`) as HTMLInputElement
        ).checked,
        readOnly: (
          document.getElementById(`${type}-readOnly`) as HTMLInputElement
        ).checked,
        forms: [],
      };
      const description = (
        document.getElementById(`${type}-description`) as HTMLTextAreaElement
      ).value;
      if (description !== "") {
        property.description = description;
      }

      const dataType = (
        document.getElementById(`${type}-type`) as HTMLSelectElement
      ).value;
      if (dataType !== NO_TYPE) {
        property.type = dataType;
      }
      if (dataType === "array") {
        property.items = {};
      } else if (dataType === "object") {
        property.properties = {};
      }
      property.forms = [];

      const td = context.parsedTD;
      if (td[key] && td[key][property.title]) {
        showErrorMessage(`A ${name} with this title already exists...`);
      } else {
        td[key] = { ...td[key], [property.title]: property };
        context.updateOfflineTD(JSON.stringify(td, null, 2));
        close();
      }
    };

    const showErrorMessage = (msg: string): void => {
      (
        document.getElementById(`${type}-title-helper-text`) as HTMLElement
      ).textContent = msg;
      (
        document.getElementById(`${type}-title`) as HTMLInputElement
      ).classList.remove("border-gray-600");
      (
        document.getElementById(`${type}-title`) as HTMLInputElement
      ).classList.add("border-red-400");
    };

    const clearErrorMessage = (): void => {
      (
        document.getElementById(`${type}-title-helper-text`) as HTMLElement
      ).textContent = "";
      (
        document.getElementById(`${type}-title`) as HTMLInputElement
      ).classList.add("border-gray-600");
      (
        document.getElementById(`${type}-title`) as HTMLInputElement
      ).classList.remove("border-red-400");
    };

    if (display) {
      return ReactDOM.createPortal(
        <DialogTemplate
          onHandleEventLeftButton={close}
          onHandleEventRightButton={() => {
            onAddProperty();
          }}
          rightButton={`Add ${name}`}
          children={children}
          title={`Add New ${name}`}
          description={`Tell us a little something about the ${name} you want to add.`}
        />,
        document.getElementById("modal-root") as HTMLElement
      );
    }

    return null;
  }
);

AddPropertyDialog.displayName = "AddPropertyDialog";
export default AddPropertyDialog;
