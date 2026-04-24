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

import React, { useContext, useState, useMemo, useRef } from "react";
import ediTDorContext from "../../../context/ediTDorContext";
import AddActionDialog from "../../Dialogs/AddActionDialog";
import AddEventDialog from "../../Dialogs/AddEventDialog";
import { AddPropertyDialog } from "../../Dialogs/AddPropertyDialog";
import InfoIconWrapper from "../../base/InfoIconWrapper";
import { tooltipMapper } from "../../../utils/TooltipMapper";
import Action from "./Action";
import Event from "./Event";
import Property from "./Property";
import SearchBar from "./SearchBar";
import EditProperties from "./EditProperties";
import BaseTable from "../base/BaseTable";
import DialogTemplate from "./../../Dialogs/DialogTemplate";
import Editor from "@monaco-editor/react";
import { readPropertyWithServient } from "../../../services/form";
import { extractIndexFromId, formatText } from "../../../utils/strings";
import BaseButton from "../base/BaseButton";
import type {
  FormElementBase,
  ThingDescription,
} from "wot-thing-description-types";
import { getLocalStorage } from "../../../services/localStorage";
import ErrorDialog from "../../Dialogs/ErrorDialog";
import { readAllReadablePropertyForms } from "../../../services/thingsApiService";
import { AlertTriangle } from "react-feather";
import { getErrorSummary } from "../../../utils/arrays";
import { copyAffordance } from "../../../utils/copyAffordance";
import type { IInteractionAffordance } from "../../../types/form";

const SORT_ASC = "asc";
const SORT_DESC = "desc";

interface IInteractionSectionProps {
  interaction: "Properties" | "Actions" | "Events";
  customBreakpoints?: number;
}

type InteractionKey = "properties" | "actions" | "events";

interface ICopiedAffordanceTarget {
  section: InteractionKey;
  name: string;
  token: number;
}

/**
 * Renders a section for an interaction (Property, Action, Event) with a
 * search bar, a sorting icon and a button to add a new interaction.
 *
 * The parameter interaction can be one of "Properties", "Actions" or "Events".
 * @param {String} interaction
 */
const InteractionSection: React.FC<IInteractionSectionProps> = (props) => {
  const context = useContext(ediTDorContext);
  const td: ThingDescription = context.isValidJSON
    ? JSON.parse(context.offlineTD)
    : {};
  const northboundConnection = useMemo(() => {
    return {
      message: context.northboundConnection?.message ?? "",
      northboundTd: context.northboundConnection?.northboundTd ?? {},
    };
  }, [context.northboundConnection]);
  /** States */
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState(SORT_ASC);
  const createPropertyDialog = useRef<{ openModal: () => void } | null>(null);
  const [modeView, setModeView] = useState<"table" | "list">("list");
  const [isDialogOpen, setIsDialogOpen] = useState(false); // State to control dialog visibility
  const [editorContent, setEditorContent] = useState<{
    editorState: string;
    propName: string;
    formsIndex: number;
    state: "viewProperty" | "viewPropertyElementForm" | "sendRequest";
    title: string;
  }>({
    editorState: "",
    propName: "",
    formsIndex: 0,
    state: "viewProperty",
    title: "Edit Property",
  }); // State to manage editor content
  const [errorDisplay, setErrorDisplay] = useState<{
    state: boolean;
    message: string;
  }>({
    state: false,
    message: "",
  });

  const [propertyResponseMap, setPropertyResponseMap] = useState<
    Record<string, { value: string; error: string }>
  >({});

  const [isTestingAll, setIsTestingAll] = useState(false);
  const [copiedAffordance, setCopiedAffordance] =
    useState<ICopiedAffordanceTarget | null>(null);

  const interaction = props.interaction.toLowerCase() as InteractionKey;

  const updateFilter = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFilter(event.target.value);

  const isBaseModbus: boolean =
    !!td.base?.includes("modbus://") || !!td.base?.includes("modbus+tcp");

  const hasModbusProperties = (obj: ThingDescription): boolean => {
    if (!obj.properties || Object.keys(obj.properties).length === 0) {
      return false;
    }

    const isHrefModbus = (form: FormElementBase): boolean => {
      if (!form.href) {
        return false;
      } else {
        return (
          form.href.includes("modbus://") || form.href.includes("modbus+tcp://")
        );
      }
    };

    return (
      isBaseModbus ||
      Object.values(obj.properties).some((property) =>
        property.forms?.some((form) => isHrefModbus(form))
      )
    );
  };

  const summary = useMemo(
    () => getErrorSummary(propertyResponseMap),
    [propertyResponseMap]
  );

  /**
   * Returns an Object containing all interactions with keys
   * matching to the filter.
   */
  const applyFilter = (): Record<string, any> => {
    const source: any = (td as any)[interaction];
    if (!source) return {};
    const filtered: Record<string, any> = {};
    Object.keys(source)
      .filter((k) => k.toLowerCase().includes(filter.toLowerCase()))
      .forEach((k) => {
        filtered[k] = source[k];
      });
    return filtered;
  };

  const sortKeysInObject = (kind: InteractionKey) => {
    const source: any = (td as any)[kind];
    if (!source) return;
    const ordered: Record<string, any> = {};
    const toSort = Object.keys(source).map((x) => ({
      key: x,
      title: source[x].title,
    }));
    if (sortOrder === SORT_ASC) {
      toSort
        .sort((a, b) => {
          const nameA = a.title ? a.title : a.key;
          const nameB = b.title ? b.title : b.key;
          return nameA.localeCompare(nameB);
        })
        .forEach(function (sortedObject) {
          ordered[sortedObject.key] = source[sortedObject.key];
        });
      setSortOrder(SORT_DESC);
    } else {
      toSort
        .sort((a, b) => {
          const nameA = a.title ? a.title : a.key;
          const nameB = b.title ? b.title : b.key;
          return nameA.localeCompare(nameB);
        })
        .reverse()
        .forEach(function (sortedObject) {
          ordered[sortedObject.key] = source[sortedObject.key];
        });
      setSortOrder(SORT_ASC);
    }
    (td as any)[kind] = ordered;
    context.updateOfflineTD(JSON.stringify(td, null, 2));
  };

  const sortedIcon = () => {
    if (sortOrder === SORT_ASC) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4" />
        </svg>
      );
    }

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 5h4M11 9h7M11 13h10M3 17l3 3 3-3M6 18V4" />
      </svg>
    );
  };

  const handleOnClickSendRequest = async (item: {
    [key: string]: any;
  }): Promise<{ value: string; error: string }> => {
    const index = extractIndexFromId(item.id);

    const tdSource =
      Object.keys(northboundConnection.northboundTd).length > 0 && isBaseModbus
        ? (northboundConnection.northboundTd as ThingDescription)
        : td;

    try {
      const res = await readPropertyWithServient(
        tdSource,
        item.propName,
        { formIndex: index },
        getLocalStorage("valuePath") ?? ""
      );
      const outcome = res.err
        ? { value: "", error: res.err.message }
        : { value: res.result, error: "" };
      setPropertyResponseMap((prev) => ({ ...prev, [item.id]: outcome }));
      return outcome;
    } catch (e: any) {
      const outcome = { value: "", error: "Read property failed" };
      setPropertyResponseMap((prev) => ({ ...prev, [item.id]: outcome }));
      return outcome;
    }
  };

  const handleTestAllProperties = async () => {
    if (interaction !== "properties" || modeView !== "table") return;
    setIsTestingAll(true);
    let resMap: Record<string, { value: string; error: string }> = {};
    try {
      const filteredInteractions = applyFilter();
      const items = Object.keys(filteredInteractions).flatMap((key) => {
        const forms = filteredInteractions[key].forms || [];
        return forms.map((form: FormElementBase, index: number) => ({
          id: `${key} - ${index}`,
          propName: key,
          ...form,
        }));
      });
      const readableItems = items.filter((form: any) =>
        Array.isArray(form.op)
          ? form.op.includes("readproperty")
          : form.op === "readproperty"
      );
      if (readableItems.length === 0) {
        setIsTestingAll(false);
        return;
      }
      const tdSource =
        Object.keys(northboundConnection.northboundTd).length > 0 &&
        isBaseModbus
          ? (northboundConnection.northboundTd as ThingDescription)
          : td;
      resMap = await readAllReadablePropertyForms(
        tdSource,
        readableItems.map((r) => ({ id: r.id, propName: r.propName })),
        getLocalStorage("valuePath") ?? ""
      );
      setPropertyResponseMap((prev) => ({ ...prev, ...resMap }));
    } catch (e: any) {
      setPropertyResponseMap((prev) => ({
        ...prev,
        ...resMap,
        _error: {
          value: "",
          error: e?.message || "Unknown error",
        },
      }));
    } finally {
      setIsTestingAll(false);
    }
  };

  const handleCellClick = (
    item: { [key: string]: any },
    headerKey: string,
    value: any
  ) => {
    const index = extractIndexFromId(item.id);
    try {
      const target: any = (td as any)[interaction]?.[item.propName];
      if (target?.forms?.[index]) {
        target.forms[index][headerKey] = value;
        context.updateOfflineTD(JSON.stringify(td, null, 2));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOnRowClick = (
    item: { [key: string]: any },
    state: "viewProperty" | "viewPropertyElementForm"
  ) => {
    const index = extractIndexFromId(item.id);
    let value: any;
    const target: any = (td as any)[interaction]?.[item.propName];
    if (state === "viewPropertyElementForm") {
      value = target?.forms?.[index];
    } else {
      value = { [item.propName]: target };
    }

    setEditorContent({
      editorState: JSON.stringify(value, null, 2),
      propName: item.propName,
      formsIndex: index,
      state: state,
      title:
        state === "viewProperty"
          ? editorContent.title
          : `Edit form number ${index + 1} of property ${item.propName}`,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditorContent({
      editorState: "",
      propName: "",
      formsIndex: 0,
      state: "viewProperty",
      title: "Edit Property",
    });
    setIsDialogOpen(false);
  };

  const handleDialogSubmit = () => {
    let value = JSON.parse(editorContent.editorState);
    const targetContainer: any = (td as any)[interaction];
    if (!targetContainer) return handleDialogClose();
    if (editorContent.state === "viewProperty") {
      targetContainer[editorContent.propName] = value[editorContent.propName];
    } else if (
      targetContainer[editorContent.propName]?.forms?.[editorContent.formsIndex]
    ) {
      targetContainer[editorContent.propName].forms[editorContent.formsIndex] =
        value;
    }

    context.updateOfflineTD(JSON.stringify(td, null, 2));

    setIsDialogOpen(false);

    setEditorContent({
      editorState: "",
      propName: "",
      formsIndex: 0,
      state: "viewProperty",
      title: "Edit Property",
    });
  };

  const handleCopyAffordance = (
    section: InteractionKey,
    originalName: string,
    affordance: IInteractionAffordance
  ) => {
    const { updatedTD, newName } = copyAffordance({
      parsedTD: context.parsedTD,
      section,
      originalName,
      affordance,
    });

    context.updateOfflineTD(JSON.stringify(updatedTD, null, 2));
    setCopiedAffordance({
      section,
      name: newName,
      token: Date.now(),
    });
  };

  const buildChildren = () => {
    const filteredInteractions = applyFilter();

    if (td.properties && interaction === "properties") {
      if (modeView === "list") {
        return Object.keys(filteredInteractions).map((key, index) => (
          <Property
            prop={(filteredInteractions as any)[key]}
            propName={key}
            copiedToken={
              copiedAffordance?.section === "properties" &&
              copiedAffordance.name === key
                ? copiedAffordance.token
                : undefined
            }
            onCopy={() =>
              handleCopyAffordance(
                "properties",
                key,
                (
                  filteredInteractions as Record<string, IInteractionAffordance>
                )[key]
              )
            }
            key={key}
          />
        ));
      }

      const headers: { key: string; text: string }[] = Object.keys(
        filteredInteractions
      ).length
        ? [
            ...["id", "description", "propName", "editForm", "previewValue"],
            ...[
              ...new Set(
                Object.keys(filteredInteractions).flatMap((key) => {
                  const forms = (filteredInteractions as any)[key].forms || [];
                  return forms.flatMap((form: FormElementBase) =>
                    Object.keys(form)
                  );
                })
              ),
            ],
          ].map((key) => ({
            key,
            text: formatText(key),
          }))
        : [];

      const items = Object.keys(filteredInteractions).flatMap((key) => {
        const forms = (filteredInteractions as any)[key].forms || [];
        return forms.map((form: FormElementBase, index: number) => ({
          id: `${key} - ${index}`,
          description: (filteredInteractions as any)[key].description ?? "",
          propName: key,
          ...form,
        }));
      });

      let filteredItems = items.filter((form: FormElementBase) => {
        if (Array.isArray(form.op)) {
          return form.op.includes("readproperty");
        }
        return form.op === "readproperty";
      });

      let filteredHeaders = headers
        .filter((header) => header.key !== "op")
        .filter((header) => header.key !== "id")
        .filter((header) => header.key !== "description");

      if (isBaseModbus) {
        filteredHeaders = filteredHeaders.filter(
          (header) => header.key !== "href"
        );
      }

      return (
        <>
          <BaseTable
            headers={filteredHeaders}
            items={filteredItems}
            itemsPerPage={10}
            orderBy=""
            order="asc"
            onCellClick={handleCellClick}
            onRowClick={handleOnRowClick}
            onSendRequestClick={handleOnClickSendRequest}
            baseUrl={td.base ?? ""}
            requestResults={propertyResponseMap}
          />
          {summary.errorCount > 0 && (
            <div className="mt-4 rounded-md bg-red-100 p-3 text-red-700">
              <p className="font-bold">
                Found {summary.errorCount} error
                {summary.errorCount > 1 ? "s" : ""}
              </p>
              <p className="mt-1">
                First error in property name{" "}
                <span className="font-semibold">{summary.firstError.id}</span>:{" "}
                {summary.firstError.message}
              </p>
            </div>
          )}
        </>
      );
    }
    if (td.actions && interaction === "actions") {
      return Object.keys(filteredInteractions).map((key) => (
        <Action
          action={(filteredInteractions as any)[key]}
          actionName={key}
          copiedToken={
            copiedAffordance?.section === "actions" &&
            copiedAffordance.name === key
              ? copiedAffordance.token
              : undefined
          }
          onCopy={() =>
            handleCopyAffordance(
              "actions",
              key,
              (filteredInteractions as Record<string, IInteractionAffordance>)[
                key
              ]
            )
          }
          key={key}
        />
      ));
    }
    if (td.events && interaction === "events") {
      return Object.keys(filteredInteractions).map((key) => (
        <Event
          event={(filteredInteractions as any)[key]}
          eventName={key}
          copiedToken={
            copiedAffordance?.section === "events" &&
            copiedAffordance.name === key
              ? copiedAffordance.token
              : undefined
          }
          onCopy={() =>
            handleCopyAffordance(
              "events",
              key,
              (filteredInteractions as Record<string, IInteractionAffordance>)[
                key
              ]
            )
          }
          key={key}
        />
      ));
    }
  };

  const handleOpenCreatePropertyDialog = () => {
    if (createPropertyDialog.current) {
      createPropertyDialog.current.openModal();
    }
  };

  let addInteractionDialog;
  switch (interaction) {
    case "properties":
      addInteractionDialog = <AddPropertyDialog ref={createPropertyDialog} />;
      break;
    case "actions":
      addInteractionDialog = <AddActionDialog ref={createPropertyDialog} />;
      break;
    case "events":
      addInteractionDialog = <AddEventDialog ref={createPropertyDialog} />;
      break;
    default:
  }

  const childrenContent = buildChildren();

  return (
    <>
      <div className="flex items-end justify-start pb-4 pt-8">
        <div
          className={`flex ${props.customBreakpoints === 2 ? "flex-col" : "flex-grow"}`}
        >
          <InfoIconWrapper
            tooltip={tooltipMapper[interaction]}
            id={interaction}
          >
            <h2 className="flex-grow pr-1 text-2xl text-white">
              {props.interaction}
            </h2>
          </InfoIconWrapper>
          <div>
            {interaction === "properties" && (
              <BaseButton
                onClick={() => setModeView("list")}
                variant="primary"
                type="button"
                className="h-9"
              >
                List
              </BaseButton>
            )}
            {interaction === "properties" && (
              <BaseButton
                onClick={() => setModeView("table")}
                variant="primary"
                type="button"
                className="ml-2 h-9"
              >
                Table
              </BaseButton>
            )}
          </div>
        </div>
        <SearchBar
          onKeyUp={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter(e)}
          placeholder={`Search ${props.interaction}`}
          ariaLabel={`Search through all ${props.interaction}`}
        />
        <div className="w-2"></div>
        <BaseButton
          onClick={() => sortKeysInObject(interaction)}
          variant="primary"
          type="button"
          className="h-9"
        >
          {sortedIcon()}
        </BaseButton>
        <div className="w-2"></div>
        <BaseButton
          onClick={handleOpenCreatePropertyDialog}
          variant="primary"
          type="button"
          className="h-9"
        >
          Add
        </BaseButton>
        {interaction === "properties" && modeView === "table" && (
          <>
            <div className="w-2"></div>
            <BaseButton
              onClick={handleTestAllProperties}
              variant="primary"
              type="button"
              disabled={isTestingAll}
              className="h-9"
            >
              {isTestingAll ? "Testing..." : "Preview All Values"}
            </BaseButton>
          </>
        )}
        {addInteractionDialog}
      </div>

      {interaction === "properties" && hasModbusProperties(td) && (
        <EditProperties
          isBaseModbus={hasModbusProperties(td)}
          customBreakpoints={props.customBreakpoints ?? 0}
        />
      )}

      {childrenContent && (
        <div className="rounded-lg bg-gray-600 px-4 pb-4 pt-4">
          {childrenContent ? childrenContent : <div className="px-6">{}</div>}
        </div>
      )}

      {/* Dialog Template */}
      {isDialogOpen && (
        <DialogTemplate
          title={editorContent.title}
          description="Modify the content using this editor"
          onHandleEventLeftButton={handleDialogClose}
          onHandleEventRightButton={handleDialogSubmit}
          rightButton="Save"
        >
          <Editor
            height="400px"
            defaultLanguage="json"
            value={editorContent.editorState}
            onChange={(value) =>
              setEditorContent({
                ...editorContent,
                editorState: value || "",
              })
            } // Update editor content
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
            theme="vs-dark"
          />
        </DialogTemplate>
      )}
      <ErrorDialog
        isOpen={errorDisplay.state}
        onClose={() => setErrorDisplay({ state: false, message: "" })}
        errorMessage={errorDisplay.message}
      />
    </>
  );
};

export default InteractionSection;
