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
import React, {
  forwardRef,
  useContext,
  useImperativeHandle,
  useMemo,
  useReducer,
} from "react";
import ReactDOM from "react-dom";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import type {
  FormElementBase,
  ThingDescription,
} from "wot-thing-description-types";
import Ajv2019 from "ajv/dist/2019";
import addFormats from "ajv-formats";
import { ProgressBar, Step } from "../App/ProgressBar";

import ediTDorContext from "../../context/ediTDorContext";
import {
  contributionToCatalogReducer,
  initialState,
} from "../../context/ContributeToCatalogState";
import DialogTemplate from "./DialogTemplate";
import ContributeToCatalog from "../App/ContributeToCatalog";
import { isValidUrl, formatText } from "../../utils/strings";
import { getJsonLdString } from "../../utils/arrays";
import { requestWeb } from "../../services/thingsApiService";
import {
  normalizeContext,
  extractPlaceholders,
  generateIdForThingDescription,
} from "../../services/operations";

export interface IContributeToCatalogProps {
  openModal: () => void;
  close: () => void;
}

type PlaceholderValues = Record<string, string>;

const TITLE = "Contribute your TM to a TM Catalog";
const VALIDATION_TMC_MANDATORY =
  "https://raw.githubusercontent.com/wot-oss/tmc/main/internal/commands/validate/tmc-mandatory.schema.json";
const VALIDATION_TM_JSON =
  "https://raw.githubusercontent.com/wot-oss/tmc/main/internal/commands/validate/tm-json-schema-validation.json";
const VALIDATION_MODBUS =
  "https://raw.githubusercontent.com/wot-oss/tmc/refs/heads/main/internal/commands/validate/modbus.schema.json";
const VALIDATION_MODBUS_OLD =
  "https://raw.githubusercontent.com/wot-oss/tmc/main/internal/commands/validate/modbus-old.schema.json";

const ContributeToCatalogDialog = forwardRef((props, ref) => {
  const context = useContext(ediTDorContext);
  const td: ThingDescription = context.parsedTD;
  const contributeCatalogData = context.contributeCatalog;

  /** General */
  const [state, dispatch] = useReducer(
    contributionToCatalogReducer,
    initialState
  );

  const dynamicTitle = useMemo(() => {
    const step = state.workflow.currentStep;
    return `${TITLE} - ${step === 1 ? "Metadata" : step === 2 ? "Interaction" : "Submission"}`;
  }, [state.workflow.currentStep]);

  const progressPercent = useMemo(() => {
    const step = state.workflow.currentStep;
    return step === 1 ? 0 : step === 2 ? 50 : 100;
  }, [state.workflow.currentStep]);

  const propertiesTd = useMemo(() => {
    return td["properties"] || {};
  }, [td]);

  useImperativeHandle(ref, () => {
    return {
      openModal: () => open(),
      close: () => close(),
    };
  });

  const open = () => {
    const metadataFromTd = {
      model:
        getJsonLdString(td, ["schema:mpn"]) ??
        contributeCatalogData.model ??
        "",
      author:
        getJsonLdString(td, ["schema:author", "schema:name"]) ??
        contributeCatalogData.author ??
        "",
      manufacturer:
        getJsonLdString(td, ["schema:manufacturer", "schema:name"]) ??
        contributeCatalogData.manufacturer ??
        "",
      license:
        getJsonLdString(td, ["schema:license"]) ??
        contributeCatalogData.license ??
        "",
      copyrightYear:
        getJsonLdString(td, ["schema:copyrightYear"]) ??
        contributeCatalogData.copyrightYear ??
        "",
      holder: (
        getJsonLdString(td, ["schema:copyrightHolder", "schema:name"]) ??
        contributeCatalogData.holder ??
        ""
      ).trim(),
    };
    dispatch({ type: "INITIALIZE_METADATA", payload: metadataFromTd });

    const urlParams = new URLSearchParams(window.location.search);

    const tmcEndpointParam = urlParams.get("tmcendpoint");
    const repositoryParam = urlParams.get("repo");

    const decodedTmcEndpoint = tmcEndpointParam
      ? decodeURIComponent(tmcEndpointParam)
      : "";

    const decodedRepository = repositoryParam
      ? decodeURIComponent(repositoryParam)
      : "";

    if (!isValidUrl(decodedTmcEndpoint) && decodedTmcEndpoint !== "") {
      dispatch({
        type: "SET_SUBMISSION_TMCATALOG_ENDPOINT_ERROR",
        payload: "Please enter a valid URL starting with http:// or https://",
      });
    }

    if (
      decodedTmcEndpoint === "" &&
      contributeCatalogData.tmCatalogEndpoint !== ""
    ) {
      dispatch({
        type: "SET_SUBMISSION_TMCATALOG_ENDPOINT",
        payload: contributeCatalogData.tmCatalogEndpoint,
      });
    } else {
      dispatch({
        type: "SET_SUBMISSION_TMCATALOG_ENDPOINT",
        payload: decodedTmcEndpoint,
      });
    }

    if (
      decodedRepository === "" &&
      contributeCatalogData.nameRepository !== ""
    ) {
      dispatch({
        type: "SET_SUBMISSION_REPOSITORY",
        payload: contributeCatalogData.nameRepository,
      });
    } else {
      dispatch({
        type: "SET_SUBMISSION_REPOSITORY",
        payload: decodedRepository,
      });
    }

    dispatch({ type: "SHOW_DIALOG", payload: true });
  };

  const close = () => {
    dispatch({ type: "RESET_STATE" });

    context.updateNorthboundConnection({
      message: "",
      northboundTd: {},
    });

    context.updateContributeCatalog({
      ...context.contributeCatalog,
      dynamicValues: {},
    });
  };

  const handleCatalogValidation = async () => {
    dispatch({ type: "SET_METADATA_ERROR_MESSAGE", payload: "" });
    dispatch({ type: "SET_METADATA_VALIDATION", payload: "VALIDATING" });

    const { model, author, manufacturer, license, copyrightYear, holder } =
      state.metadata;
    try {
      const tdCopy = structuredClone(td);

      if (
        model.trim() === "" ||
        author.trim() === "" ||
        manufacturer.trim() === ""
      ) {
        let message = `Please fill in all required fields: ${model === "" ? "Model" : ""} ${author === "" ? "Author" : ""} ${manufacturer === "" ? "Manufacturer" : ""}`;
        throw new Error(message);
      }

      tdCopy["schema:mpn"] = model;
      tdCopy["schema:author"] = {
        "schema:name": author,
      };
      tdCopy["schema:manufacturer"] = {
        "@type": "Organization",
        "schema:name": manufacturer,
      };
      /** Non mandatory fields */
      if (license && license.trim() !== "") {
        tdCopy["schema:license"] = license;
      } else {
        delete tdCopy["schema:license"];
      }
      if (copyrightYear) {
        tdCopy["schema:copyrightYear"] = copyrightYear;
      } else {
        delete tdCopy["schema:copyrightYear"];
      }
      if (holder && holder.trim() !== "") {
        tdCopy["schema:copyrightHolder"] = {
          "@type": "Organization",
          "schema:name": holder,
        };
      } else {
        delete tdCopy["schema:copyrightHolder"];
      }

      try {
        tdCopy["@context"] = normalizeContext(tdCopy["@context"]);
      } catch (err) {
        let message = `Context normalization error: ${err instanceof Error ? err.message : "Unknown error"}`;
        throw new Error(message);
      }

      const tdTransformed = generateIdForThingDescription(tdCopy);

      const ajv = new Ajv2019({
        strict: false,
        allErrors: true,
        validateFormats: true,
      });
      addFormats(ajv);
      ajv.addMetaSchema(draft7MetaSchema);

      let response = await fetch(VALIDATION_TMC_MANDATORY);
      if (!response.ok)
        throw new Error(
          `Failed to fetch schema from ${VALIDATION_TMC_MANDATORY}`
        );

      let schema = await response.json();
      let validate = ajv.compile(schema);
      let valid = validate(tdTransformed);
      if (!valid) {
        let message = `Validation failed for ${VALIDATION_TMC_MANDATORY}: ${
          validate.errors ? ajv.errorsText(validate.errors) : ""
        }`;
        throw new Error(message);
      }

      response = await fetch(VALIDATION_TM_JSON);
      if (!response.ok)
        throw new Error(`Failed to fetch schema from ${VALIDATION_TM_JSON}`);

      let schemaTmJson = await response.json();
      ajv.addSchema(schemaTmJson);

      response = await fetch(VALIDATION_MODBUS);
      if (!response.ok)
        throw new Error(`Failed to fetch schema from ${VALIDATION_MODBUS}`);
      schema = await response.json();
      validate = ajv.compile(schema);
      valid = validate(tdTransformed);
      if (!valid) {
        let message = `Validation failed for ${VALIDATION_MODBUS}: ${
          validate.errors ? ajv.errorsText(validate.errors) : ""
        }`;
        throw new Error(message);
      }

      response = await fetch(VALIDATION_MODBUS_OLD);
      if (!response.ok)
        throw new Error(`Failed to fetch schema from ${VALIDATION_MODBUS_OLD}`);
      schema = await response.json();
      validate = ajv.compile(schema);
      valid = validate(tdTransformed);
      if (!valid) {
        let message = `Validation failed for ${VALIDATION_MODBUS_OLD}: ${
          validate.errors ? ajv.errorsText(validate.errors) : ""
        }`;
        throw new Error(message);
      }

      dispatch({ type: "SET_BACKGROUND_TD_TO_SEND", payload: tdTransformed });
      dispatch({ type: "SET_METADATA_ERROR_MESSAGE", payload: "" });
      dispatch({ type: "SET_METADATA_VALIDATION", payload: "VALID" });
      dispatch({
        type: "UPDATE_INTERACTION_PLACEHOLDER_VALUES",
        payload: initialPlaceholderValues,
      });
    } catch (err) {
      let message = `Could not validate:
        ${err instanceof Error ? err.message : String(err)}`;
      dispatch({ type: "SET_METADATA_ERROR_MESSAGE", payload: message });
      return;
    }
  };

  const handleCopyThingModelClick = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(state.workflow.backgroundTdToSend, null, 2)
    );
    dispatch({ type: "SET_METADATA_COPIED", payload: true });
  };

  const handleOnChangeModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_MODEL", payload: value });
    contributeCatalogData.model = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const handleOnChangeAuthor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_AUTHOR", payload: value });
    contributeCatalogData.author = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const handleOnChangeManufacturer = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_MANUFACTURER", payload: value });
    contributeCatalogData.manufacturer = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const handleOnChangeLicense = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_LICENSE", payload: value });
    contributeCatalogData.license = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const handleOnChangeCopyrightYear = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_COPYRIGHT_YEAR", payload: value });
    contributeCatalogData.copyrightYear = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const handleOnChangeHolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: "SET_METADATA_HOLDER", payload: value });
    contributeCatalogData.holder = value;
    context.updateContributeCatalog(contributeCatalogData);
  };

  const initialPlaceholderValues = useMemo<PlaceholderValues>(() => {
    if (!context.offlineTD) {
      return {};
    }
    const placeholders: string[] = extractPlaceholders(context.offlineTD);
    return placeholders.reduce<PlaceholderValues>((acc, key: string) => {
      acc[key] = "";
      return acc;
    }, {});
  }, [context.offlineTD]);

  const handleFieldChange = (placeholder: string, value: string) => {
    dispatch({
      type: "UPDATE_INTERACTION_SINGLE_PLACEHOLDER",
      key: placeholder,
      value: value.trim(),
    });
    context.updateContributeCatalog({
      ...context.contributeCatalog,
      dynamicValues: {
        ...context.contributeCatalog.dynamicValues,
        [placeholder]: value.trim(),
      },
    });
  };

  const handleSubmit = async () => {
    dispatch({ type: "SET_SUBMISSION_SUBMITTED_ERROR", payload: "" });
    dispatch({ type: "SET_SUBMISSION_SUBMITTED", payload: false });

    try {
      const response = await requestWeb(
        `${state.submission.tmCatalogEndpoint}/thing-models`,
        "POST",
        JSON.stringify(state.workflow.backgroundTdToSend),
        {
          queryParams: {
            repo: state.submission.repository,
          },
        }
      );

      if (!response) {
        dispatch({
          type: "SET_SUBMISSION_SUBMITTED_ERROR",
          payload: "Failed to connect to the server",
        });
        return;
      }

      const result = await response.json();

      if (response.status === 201 && result.data) {
        const { tmID, message } = result.data;

        if (tmID) {
          dispatch({ type: "SET_SUBMISSION_SUBMITTED", payload: true });
          dispatch({ type: "SET_SUBMISSION_ID", payload: tmID });
          dispatch({
            type: "SET_SUBMISSION_LINK",
            payload: `${state.submission.tmCatalogEndpoint}/thing-models/${tmID}`,
          });
        } else {
          dispatch({
            type: "SET_SUBMISSION_SUBMITTED_ERROR",
            payload: "Response missing tmID",
          });
        }
        return;
      }
      const errorMessage = result.detail + " " + result.title;
      dispatch({
        type: "SET_SUBMISSION_SUBMITTED_ERROR",
        payload: `Error: ${errorMessage}`,
      });
      return;
    } catch (err) {
      dispatch({
        type: "SET_SUBMISSION_SUBMITTED_ERROR",
        payload: `Failed to process request: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    }
  };

  const handleTmCatalogEndpointChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    dispatch({ type: "SET_SUBMISSION_TMCATALOG_ENDPOINT", payload: value });
    contributeCatalogData.tmCatalogEndpoint = value;
    if (
      !value.startsWith("https") &&
      !value.startsWith("http:") &&
      value.length > 0
    ) {
      dispatch({
        type: "SET_SUBMISSION_TMCATALOG_ENDPOINT_ERROR",
        payload: "The endpoint must start with http or https.",
      });
    } else {
      dispatch({
        type: "SET_SUBMISSION_TMCATALOG_ENDPOINT_ERROR",
        payload: "",
      });
    }
    dispatch({ type: "SET_SUBMISSION_SUBMITTED", payload: false });
    dispatch({ type: "SET_SUBMISSION_SUBMITTED_ERROR", payload: "" });
  };

  const handleRepositoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({ type: "SET_SUBMISSION_REPOSITORY", payload: value });
    contributeCatalogData.nameRepository = value;

    if (value.length === 0) {
      dispatch({
        type: "SET_SUBMISSION_REPOSITORY_ERROR",
        payload: "The repository name is mandatory",
      });
    } else {
      dispatch({ type: "SET_SUBMISSION_REPOSITORY_ERROR", payload: "" });
    }
    dispatch({ type: "SET_SUBMISSION_SUBMITTED", payload: false });
    dispatch({ type: "SET_SUBMISSION_SUBMITTED_ERROR", payload: "" });
  };

  const tableHeaders: { key: string; text: string }[] = useMemo(() => {
    return Object.keys(propertiesTd).length
      ? [
          ...["propName"],
          ...[
            ...new Set(
              Object.keys(propertiesTd).flatMap((key) => {
                const forms = propertiesTd[key].forms || [];
                return forms.flatMap((form: FormElementBase) =>
                  Object.keys(form)
                );
              })
            ),
          ],
          ...["title"],
          ...["previewValue"],
        ].map((key) => ({
          key,
          text: formatText(key),
        }))
      : [];
  }, [propertiesTd]);

  const tabelRowsFormsOfProperties = useMemo(() => {
    return Object.keys(propertiesTd).flatMap((key) => {
      const forms = propertiesTd[key].forms || [];
      const title = propertiesTd[key].title || "";
      return forms.map((form: FormElementBase, index: number) => ({
        id: `${key} - ${index}`,
        description: propertiesTd[key].description ?? "",
        propName: key,
        title: title,
        ...form,
      }));
    });
  }, [propertiesTd]);

  const filteredRows = useMemo(() => {
    return tabelRowsFormsOfProperties.filter((form: FormElementBase) => {
      if (Array.isArray(form.op)) {
        return form.op.includes("readproperty");
      }
      return form.op === "readproperty";
    });
  }, [tabelRowsFormsOfProperties]);

  const filteredHeaders = useMemo(() => {
    return tableHeaders.filter(
      (header) =>
        header.key === "previewValue" ||
        header.key === "propName" ||
        header.key === "title"
    );
  }, [tableHeaders]);

  const handleEventOnRightButton = () => {
    if (state.workflow.currentStep === 1) {
      if (state.metadata.validation !== "VALID") {
        handleCatalogValidation();
        return;
      }
    }
    if (state.workflow.currentStep < 3) {
      dispatch({
        type: "SET_STEP",
        payload: state.workflow.currentStep + 1,
      });
    } else {
      close();
    }
  };
  const content = (
    <>
      <div className="p-4">
        <div className="p-2">
          <ProgressBar
            percent={progressPercent}
            filledBackground="linear-gradient(to right, #A8B988, #B5D7BD)"
          >
            <Step transition="scale">
              {({ accomplished, index }) => (
                <div
                  className={`h-[30px] w-[30px] rounded-full ${accomplished ? "bg-[#B5D7BD]" : "bg-gray-300"} ${accomplished ? "text-white" : "text-gray-500"} flex items-center justify-center border-2 text-lg font-bold ${accomplished ? "border-[#f0bb31]" : "border-gray-300"} transition-colors duration-300`}
                >
                  {index + 1}
                </div>
              )}
            </Step>
            <Step transition="scale">
              {({ accomplished, index }) => (
                <div
                  className={`h-[30px] w-[30px] rounded-full ${
                    accomplished ? "bg-[#B5D7BD]" : "bg-gray-300"
                  } ${
                    accomplished ? "text-white" : "text-gray-500"
                  } flex items-center justify-center border-2 text-lg font-bold ${
                    accomplished ? "border-[#f0bb31]" : "border-gray-300"
                  } transition-colors duration-300`}
                >
                  {index + 1}
                </div>
              )}
            </Step>
            <Step transition="scale">
              {({ accomplished, index }) => (
                <div
                  className={`h-[30px] w-[30px] rounded-full ${
                    accomplished ? "bg-[#B5D7BD]" : "bg-gray-300"
                  } ${
                    accomplished ? "text-white" : "text-gray-500"
                  } flex items-center justify-center border-2 text-lg font-bold ${
                    accomplished ? "border-[#f0bb31]" : "border-gray-300"
                  } transition-colors duration-300`}
                >
                  {index + 1}
                </div>
              )}
            </Step>
          </ProgressBar>
        </div>

        <ContributeToCatalog
          currentStep={state.workflow.currentStep}
          metadata={state.metadata}
          onChangeModel={handleOnChangeModel}
          onChangeAuthor={handleOnChangeAuthor}
          onChangeManufacturer={handleOnChangeManufacturer}
          onChangeLicense={handleOnChangeLicense}
          onChangeCopyrightYear={handleOnChangeCopyrightYear}
          onChangeHolder={handleOnChangeHolder}
          onClickCatalogValidation={handleCatalogValidation}
          onClickCopyThingModel={handleCopyThingModelClick}
          filteredHeaders={filteredHeaders}
          filteredRows={filteredRows}
          backgroundTdToSend={state.workflow.backgroundTdToSend}
          interaction={state.interaction}
          dispatch={dispatch}
          handleFieldChange={handleFieldChange}
          submission={state.submission}
          handleTmCatalogEndpointChange={handleTmCatalogEndpointChange}
          handleRepositoryChange={handleRepositoryChange}
          handleSubmit={handleSubmit}
        />
      </div>
    </>
  );

  if (state.workflow.showDialog) {
    return ReactDOM.createPortal(
      <DialogTemplate
        onHandleEventLeftButton={
          state.workflow.currentStep > 1
            ? () =>
                dispatch({
                  type: "SET_STEP",
                  payload: state.workflow.currentStep - 1,
                })
            : close
        }
        onHandleEventRightButton={handleEventOnRightButton}
        children={content}
        hasSubmit={true}
        leftButton={state.workflow.currentStep > 1 ? "Previous" : "Close"}
        rightButton={state.workflow.currentStep < 3 ? "Next" : "Close"}
        auxiliaryButton={state.workflow.currentStep === 2}
        onHandleEventAuxiliaryButton={close}
        title={dynamicTitle}
        description={
          "Follow the steps below to contribute your TM to a Catalog specified in the last step"
        }
        className="lg:w-[60%]"
      />,
      document.getElementById("modal-root") as HTMLElement
    );
  }

  return null;
});

ContributeToCatalogDialog.displayName = "ContributeToCatalogDialog";
export default ContributeToCatalogDialog;
