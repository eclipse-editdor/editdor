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
import React, { useState, useEffect, useCallback, useContext } from "react";
import InfoIconWrapper from "../base/InfoIconWrapper";
import TextField from "../base/TextField";
import { isValidUrl } from "../../utils/strings";
import EdiTDorContext from "../../context/ediTDorContext";

export interface SettingsData {
  northboundUrl: string;
  southboundUrl: string;
  pathToValue: string;
  jsonIndentation: 2 | 4;
}

export interface SettingsErrors {
  northboundUrl: string;
  southboundUrl: string;
  pathToValue: string;
}

interface SettingsProps {
  initialData?: SettingsData;
  onChange?: (data: SettingsData, isValid: boolean) => void;
  hideTitle?: boolean;
  className?: string;
}

const Settings: React.FC<SettingsProps> = ({
  initialData = {
    northboundUrl: "",
    southboundUrl: "",
    pathToValue: "/",
    jsonIndentation: 2,
  },
  onChange,
  hideTitle = false,
  className = "",
}) => {
  const context = useContext(EdiTDorContext);
  const [data, setData] = useState<SettingsData>(initialData);
  const [errors, setErrors] = useState<SettingsErrors>({
    northboundUrl: "",
    southboundUrl: "",
    pathToValue: "",
  });

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      jsonIndentation: context.jsonIndentation,
    }));
  }, [context.jsonIndentation]);

  useEffect(() => {
    if (onChange) {
      const isValid =
        !errors.northboundUrl && !errors.southboundUrl && !errors.pathToValue;
      onChange(data, isValid);
    }
  }, [data, errors, onChange]);

  const handleNorthboundUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setData((prev) => ({ ...prev, northboundUrl: value }));

      if (value === "") {
        setErrors((prev) => ({ ...prev, northboundUrl: "" }));
      } else if (!isValidUrl(value)) {
        setErrors((prev) => ({
          ...prev,
          northboundUrl:
            "Please enter a valid URL (e.g., http://localhost:8080)",
        }));
      } else {
        setErrors((prev) => ({ ...prev, northboundUrl: "" }));
      }
    },
    []
  );

  const handleSouthboundUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setData((prev) => ({ ...prev, southboundUrl: value }));

      if (value === "") {
        setErrors((prev) => ({ ...prev, southboundUrl: "" }));
      } else if (!isValidUrl(value)) {
        setErrors((prev) => ({
          ...prev,
          southboundUrl:
            "Please enter a valid URL (e.g., http://localhost:8080)",
        }));
      } else {
        setErrors((prev) => ({ ...prev, southboundUrl: "" }));
      }
    },
    []
  );

  const handlePathToValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setData((prev) => ({ ...prev, pathToValue: value }));

      if (value === "") {
        setErrors((prev) => ({ ...prev, pathToValue: "" }));
      } else if (!value.startsWith("/")) {
        setErrors((prev) => ({
          ...prev,
          pathToValue: "Path must start with '/'",
        }));
      } else if (value.includes(" ")) {
        setErrors((prev) => ({
          ...prev,
          pathToValue: "Path cannot contain spaces",
        }));
      } else {
        setErrors((prev) => ({ ...prev, pathToValue: "" }));
      }
    },
    []
  );

  const handleJsonIndentationChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const parsed = Number(e.target.value);
      const value: 2 | 4 = parsed === 4 ? 4 : 2;
      setData((prev) => ({ ...prev, jsonIndentation: value }));
      context.updateJsonIndentation(value);
    },
    [context]
  );

  return (
    <div className={className}>
      <div className="my-4 rounded-md bg-black bg-opacity-80 p-2">
        {!hideTitle && <h1 className="font-bold">JSON Editor</h1>}
        <div className="px-4">
          <label
            htmlFor="json-indentation-select"
            className="mb-1 block text-sm text-gray-300"
          >
            Space indentation
          </label>
          <select
            id="json-indentation-select"
            value={data.jsonIndentation}
            onChange={handleJsonIndentationChange}
            className="w-full rounded-md border-2 border-gray-600 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </div>
      </div>

      <div className="rounded-md bg-black bg-opacity-80 p-2">
        {!hideTitle && (
          <h1 className="font-bold">Third Party Service Configuration</h1>
        )}
        <div className="px-4">
          <h2 className="py-2 text-justify text-gray-400">
            If you want to interact with non-HTTP devices via a gateway, you can
            send it TDs to its southbound endpoint with a "POST" request.
            Similarly, you can retrieve TDs from its northbound endpoint. The id
            of the initial TD is used to correlate both.
          </h2>

          <TextField
            label={
              <InfoIconWrapper
                tooltip={{
                  html: "The target northbound URL should point to a server that implements the Discovery Specifications's Things API. If a valid target URL is provided, the editTDor will use it for all interactions with the Thing.",
                  href: "",
                }}
                id="settings-target-url-northbound-info"
                children={"Target URL Northbound:"}
              />
            }
            placeholder="e.g.: http://localhost:8080/"
            id="settings-target-url-field-northbound"
            type="text"
            value={data.northboundUrl}
            autoFocus={false}
            onChange={handleNorthboundUrlChange}
            className={`${
              errors.northboundUrl ? "border-red-500" : "border-gray-600"
            } w-full rounded-md border-2 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm`}
          />
          {errors.northboundUrl && (
            <div className="mt-1 text-sm text-red-500">
              {errors.northboundUrl}
            </div>
          )}

          <TextField
            label={
              <InfoIconWrapper
                tooltip={{
                  html: "The target southbound URL",
                  href: "",
                }}
                id="settings-target-url-southbound-info"
                children={"Target URL Southbound:"}
              />
            }
            placeholder="e.g.: http://localhost:8080/"
            id="settings-target-url-field-southbound"
            type="text"
            value={data.southboundUrl}
            autoFocus={false}
            onChange={handleSouthboundUrlChange}
            className={`${
              errors.southboundUrl ? "border-red-500" : "border-gray-600"
            } w-full rounded-md border-2 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm`}
          />
          {errors.southboundUrl && (
            <div className="mt-1 text-sm text-red-500">
              {errors.southboundUrl}
            </div>
          )}
        </div>
      </div>

      <div className="my-4 rounded-md bg-black bg-opacity-80 p-2">
        {!hideTitle && <h1 className="font-bold">Path to value</h1>}
        <div className="px-4">
          <h2 className="py-2 text-justify text-gray-400">
            {`If the gateway is wrapping the payloads in a JSON object, please provide the path to the value as a JSON pointer. For a JSON like {"foo": {"bar":"baz"}}, where baz is the value according the Data Schema of the TD, you should enter /foo/bar.`}
          </h2>

          <TextField
            label={
              <InfoIconWrapper
                tooltip={{
                  html: "JSON pointer path to the actual value in wrapped payloads. Use forward slashes to navigate nested objects.",
                  href: "",
                }}
                id="settingsPathToValueInfo"
                children={"JSON Pointer Path:"}
              />
            }
            placeholder="/foo/bar"
            id="settingsPathToValueField"
            type="text"
            value={data.pathToValue}
            autoFocus={false}
            onChange={handlePathToValueChange}
            className={`${
              errors.pathToValue ? "border-red-500" : "border-gray-600"
            } w-full rounded-md border-2 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm`}
          />
          {errors.pathToValue && (
            <div className="mt-1 text-sm text-red-500">
              {errors.pathToValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
