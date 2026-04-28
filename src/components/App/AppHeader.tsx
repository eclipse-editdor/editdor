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
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  Download,
  File,
  FilePlus,
  FileText,
  Settings,
  Share,
  Link,
  Send,
  Eye,
  EyeOff,
} from "react-feather";
import editdorLogo from "../../assets/editdor.png";
import ediTDorContext from "../../context/ediTDorContext";
import * as fileTdService from "../../services/fileTdService";
import { isThingModel } from "../../utils/tdOperations";
import ConvertTmDialog from "../Dialogs/ConvertTmDialog";
import CreateTdDialog from "../Dialogs/CreateTdDialog";
import SettingsDialog from "../Dialogs/SettingsDialog";
import ShareDialog from "../Dialogs/ShareDialog";
import ContributeToCatalog from "../Dialogs/ContributeToCatalogDialog";
import ErrorDialog from "../Dialogs/ErrorDialog";
import Button from "../base/Button";
import SendTDDialog from "../Dialogs/SendTDDialog";
import { getLocalStorage } from "../../services/localStorage";
import type { ThingDescription } from "wot-thing-description-types";

const EMPTY_TM_MESSAGE =
  "To contribute a Thing Model, please first load a Thing Model to be validated.";
const INVALID_TYPE_MESSAGE =
  'To contribute a Thing Model, the TM must have the following pair key/value:  "@type": "tm:ThingModel"  ';
const VALIDATION_FAILED_MESSAGE =
  "The Thing Model did not pass the JSON schema validation Please make sure the Thing Model is valid according to the JSON schema before contributing it to the catalog.";

const AppHeader: React.FC<{
  onToggleJSON: () => void;
  isJSONVisible: boolean;
}> = ({ onToggleJSON, isJSONVisible }) => {
  const context = useContext(ediTDorContext);
  const td: ThingDescription = context.parsedTD;
  /** States*/
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorDisplay, setErrorDisplay] = useState<{
    state: boolean;
    message: string;
  }>({
    state: false,
    message: "",
  });
  /** Refs */
  const convertTmDialog = useRef<{
    openModal: () => void;
    close: () => void;
  }>(null);
  const shareDialog = useRef<{ openModal: () => void }>(null);
  const createTdDialog = useRef<{ openModal: () => void }>(null);
  const settingsDialog = useRef<{
    openModal: () => void;
    close: () => void;
  }>(null);
  const contributeToCatalog = useRef<{
    openModal: () => void;
    close: () => void;
  }>(null);
  const sendTdDialog = useRef<{
    openModal: () => void;
    close: () => void;
  }>(null);

  /** Callbacks */
  const verifyDiscard = useCallback((): boolean => {
    if (!context.isModified) {
      return true;
    }

    const msg =
      "Discard changes? All changes you made to your TD will be lost.";
    return window.confirm(msg);
  }, [context.isModified]);

  const openFile = useCallback(async () => {
    if (!verifyDiscard()) {
      return;
    }

    try {
      const res = await fileTdService.readFromFile();

      const linkedFileName = `./${res.fileName}`;
      let linkedTd: Record<string, any> = {};
      linkedTd[linkedFileName] = res.fileHandle
        ? res.fileHandle
        : JSON.parse(res.td);

      context.updateOfflineTD(res.td);
      context.updateIsModified(false);

      context.setFileHandle(res.fileHandle || res.fileNname);
      context.updateLinkedTd(undefined);
      context.addLinkedTd(linkedTd);
    } catch (error) {
      const msg = "Opening a new TD was canceled or an error occured.";
      console.error(msg, error);
      setErrorDisplay({
        state: true,
        message: msg,
      });
    }
  }, [context, verifyDiscard]);

  const createNewFile = useCallback(async () => {
    setIsLoading(true);
    try {
      const fileHandle = await fileTdService.saveToFile(
        context.name,
        undefined,
        context.offlineTD
      );
      context.setFileHandle(fileHandle ?? context.fileHandle);
      context.updateIsModified(false);
    } catch (error) {
      console.debug(error);
      setErrorDisplay({
        state: true,
        message:
          "Didn't save TD. The action was either canceled or ran into an error.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const handleWithLoadingState = (func: () => Promise<any>) => {
    return async () => {
      setIsLoading(true);
      const res = await func();
      setIsLoading(false);
      return res;
    };
  };

  useEffect(() => {
    const shortcutHandler = (e: KeyboardEvent) => {
      if (
        (window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) &&
        e.key === "s"
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleWithLoadingState(createNewFile)();
      }
      if (
        (window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) &&
        e.key === "o"
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleWithLoadingState(openFile)();
      }
      if (
        (window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) &&
        e.key === "n"
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleOpenCreateTdDialog();
      }
    };

    // Adding Eventlistener for shortcuts
    document.addEventListener("keydown", shortcutHandler, false);
    window.onbeforeunload = function (event) {
      var message =
        "Important: Please click on 'Save' button to leave this page.";
      if (typeof event == "undefined") {
        event = window.event;
      }
      if (event) {
        event.returnValue = message;
      }
      return message;
    };
    return () => {
      //Remove Eventlistener for shortcuts before unmounting component
      document.removeEventListener("keydown", shortcutHandler, false);
    };
  }, [openFile, createNewFile]);

  const handleOpenConvertTmDialog = () => {
    convertTmDialog.current?.openModal();
  };

  const handleOpenShareDialog = () => {
    shareDialog.current?.openModal();
  };

  const handleOpenCreateTdDialog = () => {
    createTdDialog.current?.openModal();
  };

  const handleOpenSettingsDialog = () => {
    settingsDialog.current?.openModal();
  };

  const handleOpenContributeToCatalog = (): void => {
    if (!context.offlineTD) {
      setErrorDisplay({
        state: true,
        message: EMPTY_TM_MESSAGE,
      });
    } else if (!context.parsedTD["@type"]) {
      setErrorDisplay({
        state: true,
        message: INVALID_TYPE_MESSAGE,
      });
    } else if (context.validationMessage?.report.schema === "failed") {
      setErrorDisplay({
        state: true,
        message: VALIDATION_FAILED_MESSAGE,
      });
    } else {
      contributeToCatalog.current?.openModal();
    }
  };

  const handleSendTD = async () => {
    if (!context.offlineTD || Object.keys(context.offlineTD).length === 0) {
      setErrorDisplay({
        state: true,
        message:
          "No Thing Description available to send. Please load a valid TD.",
      });
    } else if (context.validationMessage?.report.schema === "failed") {
      setErrorDisplay({
        state: true,
        message: VALIDATION_FAILED_MESSAGE,
      });
    } else if (!getLocalStorage("southbound")) {
      setErrorDisplay({
        state: true,
        message:
          "No Southbound URL available. Please configure the Southbound URL on settings",
      });
    } else if (!td.id) {
      setErrorDisplay({
        state: true,
        message:
          "No identifier available on Thing description. Please add an identifier to the TD.",
      });
    } else {
      sendTdDialog.current?.openModal();
    }
  };

  // Condition necessary to improve the typescript checks as id is optional
  // in the current version of wot-thing-description-types
  const currentTdId = td.id ?? "";

  return (
    <>
      <header className="flex h-14 items-center justify-between bg-blue-500">
        <div className="flex items-center">
          <button
            className="ml-4"
            onClick={() =>
              window.open(
                "https://eclipse-editdor.github.io/editdor/",
                "_blank"
              )
            }
          >
            <img className="min-w-36 max-w-36" src={editdorLogo} alt="LOGO" />
          </button>
        </div>

        <div className="flex items-center gap-4 pr-2">
          {isLoading && <div className="app-header-spinner hidden md:block" />}

          <Button onClick={handleSendTD}>
            <Send />
            <div className="text-xs">Send TD</div>
          </Button>

          <Button onClick={handleOpenContributeToCatalog}>
            <Share />
            <div className="text-xs">Contribute to Catalog</div>
          </Button>

          <Button onClick={handleOpenShareDialog}>
            <Link />
            <div className="text-xs">Share</div>
          </Button>

          <div className="w-4" aria-hidden="true" />

          <div className="hidden md:block">
            <Button onClick={handleWithLoadingState(openFile)}>
              <File />
              <div className="text-xs">Open</div>
            </Button>
          </div>

          <Button onClick={handleOpenCreateTdDialog}>
            <FilePlus />
            <div className="text-xs">Create</div>
          </Button>

          {isThingModel(context.parsedTD) && (
            <Button onClick={handleOpenConvertTmDialog}>
              <FileText />
              <div className="text-xs">To TD</div>
            </Button>
          )}

          <Button onClick={handleWithLoadingState(createNewFile)}>
            <Download />
            <div className="text-xs">Download</div>
          </Button>
          <div className="w-4" aria-hidden="true" />
          <Button onClick={handleOpenSettingsDialog}>
            <Settings />
            <div className="text-xs">Settings</div>
          </Button>
          <Button onClick={onToggleJSON}>
            {isJSONVisible ? <EyeOff /> : <Eye />}
            <div className="text-xs">
              {isJSONVisible ? "Hide Code" : "Show Code"}
            </div>
          </Button>
        </div>
      </header>
      <SendTDDialog ref={sendTdDialog} currentTdId={currentTdId} />
      <ConvertTmDialog ref={convertTmDialog} />
      <ShareDialog ref={shareDialog} />
      <CreateTdDialog ref={createTdDialog} />
      <SettingsDialog ref={settingsDialog} />
      <ContributeToCatalog ref={contributeToCatalog} />
      <ErrorDialog
        isOpen={errorDisplay.state}
        onClose={() => setErrorDisplay({ state: false, message: "" })}
        errorMessage={errorDisplay.message}
      />

      <input
        className="h-0"
        type="file"
        id="fileInput"
        style={{ display: "none" }}
      />
      <a className="h-0" id="aDownload" href="/" style={{ display: "none" }} />
    </>
  );
};

export default AppHeader;
