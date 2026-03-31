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
import React, { useContext, useEffect, useState, useRef } from "react";
import ediTDorContext from "./context/ediTDorContext";
import GlobalState from "./context/GlobalState";
import JsonEditor from "./components/Editor/JsonEditor";
import TDViewer from "./components/TDViewer/TDViewer";
import "./App.css";
import AppFooter from "./components/App/AppFooter";
import AppHeader from "./components/App/AppHeader";
import { Container, Section, Bar } from "@column-resizer/react";
import { RefreshCw } from "react-feather";
import { decompressSharedTd } from "./share";
import { editor } from "monaco-editor";
import BaseButton from "./components/TDViewer/base/BaseButton";
import ErrorDialog from "./components/Dialogs/ErrorDialog";
import DialogTemplate from "./components/Dialogs/DialogTemplate";

type ReadyMessage = {
  type: "EDITDOR_READY";
};

type LoadTdMessage = {
  type: "LOAD_TD";
  description: string;
  payload: string;
};

const GlobalStateWrapper = () => {
  return (
    <GlobalState>
      <App />
    </GlobalState>
  );
};

const BREAKPOINTS = {
  MEDIUM: 1141,
  SMALL: 850,
};

// The useEffect hook for checking the URI was called twice somehow.
// This variable prevents the callback from being executed twice.
let checkedUrl = false;

const APP_TMC_UI_ORIGIN = "http://localhost:5174";

const App: React.FC = () => {
  const context = useContext(ediTDorContext);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [doShowJSON, setDoShowJSON] = useState(false);
  const [customBreakpointsState, setCustomBreakpointsState] = useState(0);
  const tdViewerRef = useRef<HTMLDivElement>(null);
  const [pendingTd, setPendingTd] = useState<string>("");
  const [pendingTitle, setPendingTitle] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const [errorDisplay, setErrorDisplay] = useState<{
    state: boolean;
    message: string;
  }>({
    state: false,
    message: "",
  });

  const showError = (message: string) => {
    setErrorDisplay({ state: true, message });
  };

  const handleUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "undo", null);
    }
  };

  const handleRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("keyboard", "redo", null);
    }
  };

  const handleToggleJSON = () => {
    setDoShowJSON((prev) => !prev);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const paramsToStore = ["northbound", "southbound", "valuePath"];

    paramsToStore.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value !== null) {
        let processedValue = value;
        if (
          (param === "northbound" || param === "southbound") &&
          !value.endsWith("/")
        ) {
          processedValue = value + "/";
        }

        localStorage.setItem(param, processedValue);
      }
    });
  }, [window.location.search]);

  useEffect(() => {
    if (
      checkedUrl ||
      (window.location.search.indexOf("td") <= -1 &&
        window.location.search.indexOf("proxyEndpoint") <= -1 &&
        window.location.search.indexOf("localstorage") <= -1 &&
        window.location.search.indexOf("southboundTdId") <= -1)
    ) {
      return;
    }
    checkedUrl = true;

    const url = new URL(window.location.href);
    const compressedTd = url.searchParams.get("td");
    if (compressedTd !== null) {
      const td = decompressSharedTd(compressedTd);
      if (td === undefined) {
        showError(
          "The lz compressed TD found in the URL couldn't be reconstructed."
        );
        return;
      }

      context.updateOfflineTD(JSON.stringify(td, null, 2));
    }

    if (url.searchParams.has("localstorage")) {
      let td = localStorage.getItem("td");
      if (!td) {
        showError("Request to read TD from local storage failed.");
        return;
      }

      try {
        td = JSON.parse(td);
        context.updateOfflineTD(JSON.stringify(td, null, 2));
      } catch (e) {
        context.updateOfflineTD(td ?? "");
        showError(
          `Tried to JSON parse the TD from local storage, but failed: ${e}`
        );
      }
    }
  }, [context]);

  useEffect(() => {
    if (!tdViewerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        let width = entry.contentRect.width;
        if (width < BREAKPOINTS.MEDIUM && width > BREAKPOINTS.SMALL) {
          setCustomBreakpointsState(1);
        } else if (width < BREAKPOINTS.SMALL) {
          setCustomBreakpointsState(2);
        } else {
          setCustomBreakpointsState(0);
        }
      }
    });

    resizeObserver.observe(tdViewerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const readyMessage: ReadyMessage = {
      type: "EDITDOR_READY",
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== APP_TMC_UI_ORIGIN) {
        return;
      }

      if ((event.data as LoadTdMessage).type !== "LOAD_TD") {
        return;
      }

      if (typeof (event.data as LoadTdMessage).payload !== "string") {
        return;
      }

      try {
        JSON.parse((event.data as LoadTdMessage).payload);
        setPendingTitle((event.data as LoadTdMessage).description);
        setPendingTd((event.data as LoadTdMessage).payload);
        setIsOpen(true);
      } catch {
        showError("Received invalid JSON from the other application.");
      }
    };

    window.addEventListener("message", handleMessage);

    if (window.opener) {
      window.opener.postMessage(readyMessage, APP_TMC_UI_ORIGIN);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const onHandleEventRightButton = () => {
    context.updateOfflineTD(pendingTd);
    setPendingTd("");
    setIsOpen(false);
  };

  const onHandleEventLeftButton = () => {
    setPendingTd("");
    setIsOpen(false);
  };

  return (
    <main className="flex max-h-screen w-screen flex-col">
      <AppHeader></AppHeader>

      <div className="">
        <Container className="height-adjust flex flex-col md:flex-row">
          <Section minSize={550} className="w-full min-w-16 md:w-7/12">
            <div ref={tdViewerRef} className="h-full w-full">
              <TDViewer
                onUndo={handleUndo}
                onRedo={handleRedo}
                customBreakpoints={customBreakpointsState}
              />
            </div>
          </Section>

          <Bar
            size={7.5}
            className="cursor-col-resize bg-gray-300 hover:bg-blue-500"
          />

          <Section className="w-full md:w-5/12">
            <JsonEditor editorRef={editorRef} />
          </Section>

          <BaseButton
            type="button"
            className="fixed bottom-12 right-2 z-10 rounded-full bg-blue-500 p-4"
            onClick={handleToggleJSON}
            variant="empty"
          >
            <RefreshCw color="white" />
          </BaseButton>
        </Container>
      </div>
      <div className="fixed bottom-0 w-screen">
        <AppFooter></AppFooter>
      </div>
      <div id="modal-root"></div>
      <ErrorDialog
        isOpen={errorDisplay.state}
        onClose={() => setErrorDisplay({ state: false, message: "" })}
        errorMessage={errorDisplay.message}
      />
      {isOpen && (
        <DialogTemplate
          title={`The Thing Description "${pendingTitle}" was received from the other application.`}
          description={`Do you wish to open the following TD  in the editdor?`}
          onHandleEventRightButton={onHandleEventRightButton}
          rightButton="Confirm"
          onHandleEventLeftButton={onHandleEventLeftButton}
        ></DialogTemplate>
      )}
    </main>
  );
};

export default GlobalStateWrapper;
