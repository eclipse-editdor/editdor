/********************************************************************************
 * Copyright (c) 2018 Contributors to the Eclipse Foundation
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
  isVersionValid,
} from "../../services/operations";
import TextField from "../base/TextField";
import { CsvWarning } from "../../utils/parser";

export interface ConvertTmDialogRef {
  openModal: () => void;
  close: () => void;
}

const ConvertTmDialog = forwardRef<ConvertTmDialogRef>((props, ref) => {
  const context = useContext(ediTDorContext);

  const [display, setDisplay] = useState(false);
  const [warnings, setWarnings] = useState<CsvWarning[]>([]);
  const [validVersion, setValidVersion] = useState(false);
  const [versionInput, setVersionInput] = useState("");

  useEffect(() => {
    setValidVersion(isVersionValid(context.parsedTD));
  }, [context.parsedTD]);

  useImperativeHandle(ref, () => ({
    openModal: () => setDisplay(true),
    close: () => setDisplay(false),
  }));

  const handleGenerateTd = () => {
    const newTD = processConversionTMtoTD(
      context.offlineTD,
      {},
      [],
      [],
      [],
      versionInput
    );
    const resultJson = JSON.stringify(newTD, null, 2);
    localStorage.setItem("td", resultJson);
    window.open(
      `${window.location.origin + window.location.pathname}?localstorage`,
      "_blank"
    );
  };

  if (!display) return null;

  return ReactDOM.createPortal(
    <DialogTemplate
      onHandleEventLeftButton={() => setDisplay(false)}
      onHandleEventRightButton={handleGenerateTd}
      rightButton={"Generate TD"}
      title={"Generate TD From TM"}
      description={"CSV conversion completed"}
    >
      <>
        {warnings.length > 0 && (
          <div className="mb-4 rounded bg-yellow-900 p-3 text-yellow-200">
            <h3 className="font-bold">CSV Import Warnings</h3>
            <ul className="list-disc pl-5">
              {warnings.map((w, i) => (
                <li key={i}>
                  Row {w.row}, {w.column}: {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!validVersion && (
          <TextField
            label="TD instance version"
            onChange={(e) => setVersionInput(e.target.value.trim())}
            value={versionInput}
            placeholder="ex: 1.0.0"
          />
        )}
      </>
    </DialogTemplate>,
    document.getElementById("modal-root") as HTMLElement
  );
});

ConvertTmDialog.displayName = "ConvertTmDialog";
export default ConvertTmDialog;
