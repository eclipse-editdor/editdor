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
  useState,
  useImperativeHandle,
} from "react";
import ReactDOM from "react-dom";
import ediTDorContext from "../../context/ediTDorContext";
import { checkIfFormIsInItem } from "../../utils/tdOperations";
import DialogTemplate from "./DialogTemplate";
import AddForm from "../App/AddForm";
import FormCheckbox from "../base/FormCheckbox";
import { HardDrive } from "react-feather";
import { set } from "lodash";

export type OperationsType = "property" | "action" | "event" | "thing" | "";
export type OperationsMap = PropertyMap | ActionMap | EventMap | ThingMap;

type PropertyMap =
  | ["writeproperty", "readproperty", "observeproperty", "unobserveproperty"]
  | [];
type ActionMap = ["invokeaction"] | [];
type EventMap = ["subscribeevent", "unsubscribeevent"] | [];
type ThingMap =
  | [
      "writeallproperties",
      "readallproperties",
      "writemultipleproperties",
      "readmultipleproperties",
      "observeallproperties",
      "unobserveallproperties",
    ]
  | [];

export interface AddFormDialogRef {
  openModal: () => void;
  close: () => void;
}

export interface ExplicitForm {
  op: string[] | string;
  href: string;
}

interface AddFormDialogProps {
  type?: OperationsType;
  interaction?: { forms?: ExplicitForm[]; type?: string };
  interactionName?: string;
}

const AddFormDialog = forwardRef<AddFormDialogRef, AddFormDialogProps>(
  (props, ref) => {
    const context: IEdiTDorContext = useContext(ediTDorContext);
    const [display, setDisplay] = useState<boolean>(() => {
      return false;
    });

    const [hrefValue, setHrefValue] = useState<string>("");
    const [error, setError] = useState<string>("");

    const type: OperationsType = props.type || "";
    const name = type && type[0].toUpperCase() + type.slice(1);
    const interaction = props.interaction ?? {};
    const interactionName = props.interactionName ?? "";

    useImperativeHandle(ref, () => {
      return {
        openModal: () => open(),
        close: () => close(),
      };
    });

    const open = () => {
      setError("");
      setHrefValue("");
      setDisplay(true);
    };

    const close = () => {
      setDisplay(false);
    };

    const operations = (type: OperationsType): OperationsMap => {
      switch (type) {
        case "property":
          return [
            "writeproperty",
            "readproperty",
            "observeproperty",
            "unobserveproperty",
          ];
        case "event":
          return ["subscribeevent", "unsubscribeevent"];
        case "action":
          return ["invokeaction"];
        case "thing":
          return [
            "writeallproperties",
            "readallproperties",
            "writemultipleproperties",
            "readmultipleproperties",
            "observeallproperties",
            "unobserveallproperties",
          ];
        default:
          return [];
      }
    };

    const checkDuplicates = (form: ExplicitForm): boolean => {
      const isDuplicate: boolean =
        interaction.forms !== undefined
          ? checkIfFormIsInItem(form, interaction)
          : false;
      return isDuplicate;
    };

    const typeToJSONKey = (type: string): string => {
      const typeToJSONKey: Record<string, string> = {
        action: "actions",
        property: "properties",
        event: "events",
        thing: "thing",
      };

      return typeToJSONKey[type];
    };

    const onHandleEventRightButton = () => {
      const form: ExplicitForm = {
        op: operations(type)
          .map((x) => {
            const element = document.getElementById(
              "form-" + x
            ) as HTMLInputElement;
            return element?.checked ? element.value : undefined;
          })
          .filter((y): y is string => y !== undefined),
        href: hrefValue.trim() || "/",
      };

      if (form.op.length === 0) {
        setError("You have to select at least one operation ...");
      } else if (checkDuplicates(form)) {
        setError(
          "A Form for one of the selected operations already exists ..."
        );
      } else {
        setError("");
        context.addForm(typeToJSONKey(type), interactionName, form);
        close();
      }
    };

    if (display) {
      return ReactDOM.createPortal(
        <DialogTemplate
          onHandleEventLeftButton={close}
          onHandleEventRightButton={onHandleEventRightButton}
          rightButton={"Add Form"}
          leftButton="Cancel"
          hasSubmit={true}
          title={`Add ${name} Form`}
          description={`Tell us how this ${name} can be interfaced by selecting operations below and providing an href.`}
        >
          <AddForm
            type={type as OperationsType}
            onInputChange={(e) => {
              setHrefValue(e.target.value.trim());
              setError("");
            }}
            operations={operations}
            error={error}
            value={hrefValue}
          ></AddForm>
        </DialogTemplate>,
        document.getElementById("modal-root") as HTMLElement
      );
    }
    return null;
  }
);

export default AddFormDialog;
AddFormDialog.displayName = "AddFormDialog";
