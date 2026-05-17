/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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
import React, { forwardRef, useImperativeHandle, useState } from "react";
import ReactDOM from "react-dom";
import { getLocalStorage, setLocalStorage } from "../../services/localStorage";
import DialogTemplate from "./DialogTemplate";
import Settings, { SettingsData } from "../App/Settings";

export interface SettingsDialogRef {
  openModal: () => void;
  close: () => void;
}

interface SettingsDialogProps {
  jsonIndentation: 2 | 4;
  onJsonIndentationChange: (value: 2 | 4) => void;
}

const SettingsDialog = forwardRef<SettingsDialogRef, SettingsDialogProps>(
  ({ jsonIndentation, onJsonIndentationChange }, ref) => {
    const [display, setDisplay] = useState<boolean>(false);
    const [settingsData, setSettingsData] = useState<SettingsData>({
      northboundUrl: "",
      southboundUrl: "",
      pathToValue: "/",
    });
    const [draftJsonIndentation, setDraftJsonIndentation] = useState<2 | 4>(
      jsonIndentation
    );
    const [isValid, setIsValid] = useState(true);

    useImperativeHandle(ref, () => {
      return {
        openModal: () => open(),
        close: () => close(),
      };
    });

    const open = () => {
      setDisplay(true);
      setSettingsData({
        northboundUrl: getLocalStorage("northbound") || "",
        southboundUrl: getLocalStorage("southbound") || "",
        pathToValue: getLocalStorage("valuePath") || "/",
      });
      setDraftJsonIndentation(jsonIndentation);
    };

    const close = async () => {
      setDisplay(false);
    };

    const handleSubmit = () => {
      if (isValid) {
        setLocalStorage(settingsData.northboundUrl, "northbound");
        setLocalStorage(settingsData.southboundUrl, "southbound");
        setLocalStorage(settingsData.pathToValue, "valuePath");
        onJsonIndentationChange(draftJsonIndentation);
        close();
      }
    };

    const handleSettingsChange = (data: SettingsData, valid: boolean) => {
      setSettingsData(data);
      setIsValid(valid);
    };

    if (display) {
      return ReactDOM.createPortal(
        <DialogTemplate
          hasSubmit={true}
          onHandleEventLeftButton={close}
          leftButton={"Cancel"}
          rightButton={"Save Changes"}
          onHandleEventRightButton={handleSubmit}
          title={"Settings"}
          description={"Change the ediTDors configuration to your needs"}
        >
          <Settings
            initialData={settingsData}
            onChange={handleSettingsChange}
            jsonIndentation={draftJsonIndentation}
            onJsonIndentationChange={setDraftJsonIndentation}
          />
        </DialogTemplate>,
        document.getElementById("modal-root") as HTMLElement
      );
    }

    return null;
  }
);

SettingsDialog.displayName = "SettingsDialog";
export default SettingsDialog;
