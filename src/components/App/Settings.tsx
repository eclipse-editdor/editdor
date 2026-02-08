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
import React, { useState, useEffect, useCallback } from "react";
import InfoIconWrapper from "../base/InfoIconWrapper";
import TextField from "../base/TextField";
import { isValidUrl } from "../../utils/strings";

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
  const [data, setData] = useState<SettingsData>(initialData);
  const [errors, setErrors] = useState<SettingsErrors>({
    northboundUrl: "",
    southboundUrl: "",
    pathToValue: "",
  });

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (onChange) {
      const isValid =
        !errors.northboundUrl &&
        !errors.southboundUrl &&
        !errors.pathToValue;
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
      const value: 2 | 4 = parsed === 2 || parsed === 4 ? parsed : 2;
      setData((prev) => ({ ...prev, jsonIndentation: value }));
    },
    []
  );

  return (
    <div className={className}>
      <div className="rounded-md bg-black bg-opacity-80 p-2">
        {!hideTitle && (
          <h1 className="font-bold">Third Party Service Configuration</h1>
        )}
        <div className="px-4">
          <h2 className="py-2 text-justify text-gray-400">
            If you want to interact with non-HTTP devices via a gateway, you can
            send it TDs to its southbound endpoint with a "POST" request.
            Similarly, you can retrieve TDs from its northbound endpoint.
          </h2>

          <TextField
            label={
              <InfoIconWrapper
                tooltip={{
                  html: "The target northbound URL should point to a server that implements the Discovery Specifications's Things API.",
                  href: "",
                }}
                id="settings-target-url-northbound-info"
              >
                Target URL Northbound:
              </InfoIconWrapper>
            }
            placeholder="e.g.: http://localhost:8080/"
            id="settings-target-url-field-northbound"
            type="text"
            value={data.northboundUrl}
            onChange={handleNorthboundUrlChange}
            className={`${
              errors.northboundUrl ? "border-red-500" : "border-gray-600"
            } w-full rounded-md border-2 bg-gray-600 p-2 text-white`}
          />
          {errors.northboundUrl && (
            <div className="mt-1 text-sm text-red-500">
              {errors.northboundUrl}
            </div>
          )}

          <TextField
            label={
              <InfoIconWrapper
                tooltip={{ html: "The target southbound URL", href: "" }}
                id="settings-target-url-southbound-info"
              >
                Target URL Southbound:
              </InfoIconWrapper>
            }
            placeholder="e.g.: http://localhost:8080/"
            id="settings-target-url-field-southbound"
            type="text"
            value={data.southboundUrl}
            onChange={handleSouthboundUrlChange}
            className={`${
              errors.southboundUrl ? "border-red-500" : "border-gray-600"
            } w-full rounded-md border-2 bg-gray-600 p-2 text-white`}
          />
          {errors.southboundUrl && (
            <div className="mt-1 text-sm text-red-500">
              {errors.southboundUrl}
            </div>
          )}
        </div>
      </div>

      <div className="my-4 rounded-md bg-black bg-opacity-80 p-2">
        {!hideTitle && <h1 className="font-bold">JSON Editor</h1>}
        <div className="px-4">
          <h2 className="py-2 text-justify text-gray-400">
            Configure how JSON content is formatted in the editor view.
          </h2>

          <label
            htmlFor="json-indentation-select"
            className="block text-sm text-gray-300 mb-1"
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
    </div>
  );
};

export default Settings;
