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
import Editor, { OnChange } from "@monaco-editor/react";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import ediTDorContext from "../../context/ediTDorContext";
import { changeBetweenTd } from "../../utils/tdOperations";
import { editor } from "monaco-editor";
import { IValidationMessage } from "../../types/context";

type SchemaMapMessage = Map<string, Record<string, unknown>>;

type JsonEditorProps = {
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
};

interface JsonSchemaEntry {
  schemaUri: string;
  schema: Record<string, unknown>;
}

// delay function that executes the callback once it hasn't been called for
// at least x ms.
let timeoutId: ReturnType<typeof setTimeout>;
const delay = (fn: (text: string) => void, text: string, ms: number) => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => fn(text), ms);
};

const JsonEditor: React.FC<JsonEditorProps> = ({ editorRef }) => {
  const context = useContext(ediTDorContext);

  // Read indentation from settings (default = 2)
  const jsonIndentation = context.settings?.jsonIndentation ?? 2;

  const [schemas] = useState<JsonSchemaEntry[]>([]);
  const [proxy, setProxy] = useState<any>(undefined);
  const editorInstance = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [tabs, setTabs] = useState<JSX.Element[]>([]);
  const [localTextState, setLocalTextState] = useState<string | undefined>("");

  const validationWorker = useMemo<Worker>(
    () =>
      new Worker(
        new URL("../../workers/validationWorker.js", import.meta.url),
        { type: "module" }
      ),
    []
  );

  const schemaWorker = useMemo<Worker>(
    () =>
      new Worker(new URL("../../workers/schemaWorker.js", import.meta.url), {
        type: "module",
      }),
    []
  );

  const messageWorkers = useCallback(
    (editorText: string) => {
      schemaWorker.postMessage(editorText);
      validationWorker.postMessage(editorText);
    },
    [schemaWorker, validationWorker]
  );

  useEffect(() => {
    const updateMonacoSchemas = (schemaMap: SchemaMapMessage) => {
      proxy.splice(0, proxy.length);

      schemaMap.forEach((schema, schemaUri) => {
        proxy.push({ schemaUri, schema });
      });
    };

    schemaWorker.onmessage = (ev: MessageEvent<SchemaMapMessage>) => {
      updateMonacoSchemas(ev.data);
    };

    validationWorker.onmessage = (ev: MessageEvent<IValidationMessage>) => {
      context.updateValidationMessage(ev.data);
    };
  }, [schemaWorker, validationWorker, proxy, context]);

  useEffect(() => {
    if (context.offlineTD !== localTextState) {
      messageWorkers(context.offlineTD);
    }
  }, [context.offlineTD, messageWorkers, localTextState]);

  // Update Monaco indentation immediately
  useEffect(() => {
    if (editorInstance.current) {
      editorInstance.current.updateOptions({
        tabSize: jsonIndentation,
        insertSpaces: true,
      });
    }
  }, [jsonIndentation]);

  const editorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor")
  ) => {
    if (!("Proxy" in window)) {
      console.warn(
        "Dynamic fetching of schemas is disabled as your browser doesn't support proxies."
      );
      return;
    }

    const proxy = new Proxy(schemas, {
      set(target: JsonSchemaEntry[], property, value: JsonSchemaEntry) {
        (target as any)[property] = value;

        const jsonSchemaObjects = target.map((entry) => ({
          fileMatch: ["*/*"],
          uri: entry.schemaUri,
          schema: entry.schema,
        }));

        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          enableSchemaRequest: true,
          schemas: jsonSchemaObjects,
        });

        return true;
      },
    });

    editorInstance.current = editor;

    if (editorRef) {
      editorRef.current = editor;
    }

    editor.updateOptions({
      tabSize: jsonIndentation,
      insertSpaces: true,
    });

    setProxy(proxy);
  };

  const onChange: OnChange = async (editorText) => {
    if (!editorText) return;

    let validate: IValidationMessage = {
      report: {
        json: null,
        schema: null,
        defaults: null,
        jsonld: null,
        additional: null,
      },
      details: {
        enumConst: null,
        propItems: null,
        security: null,
        propUniqueness: null,
        multiLangConsistency: null,
        linksRelTypeCount: null,
        readWriteOnly: null,
        uriVariableSecurity: null,
      },
      detailComments: {
        enumConst: null,
        propItems: null,
        security: null,
        propUniqueness: null,
        multiLangConsistency: null,
        linksRelTypeCount: null,
        readWriteOnly: null,
        uriVariableSecurity: null,
      },
      customMessage: "",
    };

    try {
      const parsed = JSON.parse(editorText);

      // Auto-format JSON using selected indentation
      const formatted = JSON.stringify(parsed, null, jsonIndentation);

      // Prevent infinite update loop
      if (formatted !== editorText) {
        editorInstance.current?.setValue(formatted);
      }

      context.updateOfflineTD(formatted);
      context.updateValidationMessage(validate);
    } catch (error) {
      validate.report.json = "failed";
      context.updateValidationMessage(validate);
      setLocalTextState(editorText);
      delay(messageWorkers, editorText, 500);
    }
  };

  useEffect(() => {
    if (!context.linkedTd) return;

    try {
      const tabs = Object.keys(context.linkedTd).map((key, index) => (
        <option value={key} key={index}>
          {key}
        </option>
      ));
      setTabs(tabs);
    } catch (err) {
      console.debug(err);
    }
  }, [context.linkedTd, context.offlineTD]);

  const changeLinkedTd = async () => {
    const href = (document.getElementById("linkedTd") as HTMLSelectElement).value;
    changeBetweenTd(context, href);
  };

  const beforeMount = (monaco: typeof import("monaco-editor")) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      enableSchemaRequest: true,
      schemas: [],
    });
  };

  return (
    <>
      <div className="h-[5%] bg-[#1e1e1e]">
        {context.offlineTD && context.linkedTd && (
          <select
            id="linkedTd"
            className="w-[50%] bg-[#1e1e1e] text-white"
            onChange={changeLinkedTd}
          >
            {tabs}
          </select>
        )}
      </div>

      <div className="h-[95%] w-full">
        <Editor
          options={{
            selectOnLineNumbers: true,
            automaticLayout: true,
            lineDecorationsWidth: 20,
            tabSize: jsonIndentation,
            insertSpaces: true,
          }}
          theme="vs-dark"
          language="json"
          value={context.offlineTD}
          beforeMount={beforeMount}
          onMount={editorDidMount}
          onChange={onChange}
        />
      </div>
    </>
  );
};

export default JsonEditor;
