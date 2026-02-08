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

// Monaco editor options
const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  selectOnLineNumbers: true,
  automaticLayout: true,
  lineDecorationsWidth: 20,
  tabSize: 2,
  insertSpaces: true,
};
// Ensure formatter is registered only once (Monaco is global)
let jsonFormatterRegistered = false;

// delay function that executes the callback once it hasn't been called for
// at least x ms.
let timeoutId: ReturnType<typeof setTimeout>;
const delay = (fn: (text: string) => void, text: string, ms: number) => {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => fn(text), ms);
};

type JsonEditorProps = {
  editorRef?: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
};
interface JsonSchemaEntry {
  schemaUri: string;
  schema: Record<string, unknown>;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ editorRef }) => {
  const context = useContext(ediTDorContext);

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
    if (!proxy) return;
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

  const editorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor")
  ) => {
    // Schema fetching requires Proxy support
    if (!("Proxy" in window)) {
      console.warn(
        "dynamic fetching of schemas is disabled as your browser doesn't support proxies."
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
    setProxy(proxy);
  };

  const onChange: OnChange = async (editorText: string | undefined) => {
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
      JSON.parse(editorText);
      context.updateOfflineTD(editorText);
      context.updateValidationMessage(validate);
    } catch {
      validate.report.json = "failed";
      context.updateValidationMessage(validate);
      setLocalTextState(editorText);
      delay(messageWorkers, editorText, 500);
    }
  };

  useEffect(() => {
    if (!context.linkedTd) return;

    try {
      const tabs = Object.entries(context.linkedTd)
        .filter(([_, value]) => {
          if (!value || typeof value !== "object") return false;

          const typedValue = value as { kind?: string } & Record<string, unknown>;
          if (typedValue.kind === "file") return true;

          return Object.keys(typedValue).length > 0;
        })
        .map(([key]) => (
          <option value={key} key={key}>
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
    // Register JSON formatter ONCE (independent of Proxy)
    if (!jsonFormatterRegistered) {
      monaco.languages.registerDocumentFormattingEditProvider("json", {
        provideDocumentFormattingEdits(model) {
          try {
            const parsed = JSON.parse(model.getValue());
            const formatted = JSON.stringify(parsed, null, 2);

            return [
              {
                range: model.getFullModelRange(),
                text: formatted,
              },
            ];
          } catch {
            return [];
          }
        },
      });

      jsonFormatterRegistered = true;
    }

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
          options={editorOptions}
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
