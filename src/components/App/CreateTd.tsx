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
import React from "react";
import { ChevronDown } from "react-feather";
import { parseCsv, mapCsvToProperties } from "../../utils/parser";
import FormField from "../base/FormField";
import BaseButton from "../TDViewer/base/BaseButton";

type ThingType = "TD" | "TM";

interface CreateTdProps {
  type: ThingType;
  onChangeType: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  protocol: string;
  setProtocol: React.Dispatch<React.SetStateAction<string>>;
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setProperties: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setError: React.Dispatch<
    React.SetStateAction<{ open: boolean; message: string }>
  >;

  thingId: string;
  setThingId: React.Dispatch<React.SetStateAction<string>>;
  thingTitle: string;
  setThingTitle: React.Dispatch<React.SetStateAction<string>>;
  thingBase: string;
  setThingBase: React.Dispatch<React.SetStateAction<string>>;
  thingDescription: string;
  setThingDescription: React.Dispatch<React.SetStateAction<string>>;
  thingSecurity: string;
  setThingSecurity: React.Dispatch<React.SetStateAction<string>>;
}

const CreateTd: React.FC<CreateTdProps> = ({
  type,
  onChangeType,
  protocol,
  setProtocol,
  fileName,
  setFileName,
  fileInputRef,
  setProperties,
  setError,
  thingId,
  setThingId,
  thingTitle,
  setThingTitle,
  thingBase,
  setThingBase,
  thingDescription,
  setThingDescription,
  thingSecurity,
  setThingSecurity,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setProperties({});
    setError({ open: false, message: "" });

    if (!file) {
      setError({ open: true, message: "No file selected." });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = (e.target?.result as string) || "";
        if (!csvContent.trim()) {
          throw new Error("CSV file is empty.");
        }

        const { data, warnings } = parseCsv(csvContent, true);

        const parsed = mapCsvToProperties(data);
        if (!parsed || Object.keys(parsed).length === 0) {
          throw new Error("No valid properties found in the CSV file.");
        }

        setProperties(parsed);

        // Display warnings if any
        if (warnings.length > 0) {
          const warningMessage = warnings
            .map((w) => `Row ${w.row}, column "${w.column}": ${w.message}`)
            .join("\n");
          setError({ open: true, message: `Warnings:\n${warningMessage}` });
        } else {
          setError({ open: false, message: "" });
        }
      } catch (err) {
        setProperties({});
        setError({
          open: true,
          message:
            (err as Error).message ||
            "An unexpected error occurred while processing the CSV file.",
        });
      }
    };

    reader.onerror = (e) => {
      setProperties({});
      setError({
        open: true,
        message: `Error reading file: ${e.target?.error}`,
      });
    };
    reader.readAsText(file);
  };

  const triggerFileDialog = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleDownloadCsvTemplate = (): void => {
    const csvContent = `name,title,description,type,minimum,maximum,unit,href,modbus:unitID,modbus:address,modbus:quantity,modbus:type,modbus:zeroBasedAddressing,modbus:entity,modbus:pollingTime,modbus:function,modbus:mostSignificantByte,modbus:mostSignificantWord,modbus:timeout`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modbus_tcp_properties_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <label htmlFor="type" className="pl-2 text-sm font-medium text-gray-400">
        Type:
      </label>
      <div className="relative">
        <select
          className="block w-full appearance-none rounded border-2 border-gray-600 bg-gray-600 px-4 py-3 pr-8 leading-tight text-white focus:border-blue-500 focus:outline-none"
          id="type"
          onChange={onChangeType}
          value={type}
        >
          <option value="TD">Thing Description</option>
          <option value="TM">Thing Model</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDown color="#cacaca" />
        </div>
      </div>
      <FormField
        label="ID"
        placeholder="urn:thing-id"
        id="thing-id"
        type="url"
        autoFocus={true}
        value={thingId}
        onChange={(e) => setThingId(e.target.value)}
      />
      <FormField
        label="Title"
        placeholder="Thing Title"
        id="thing-title"
        type="text"
        autoFocus={false}
        value={thingTitle}
        onChange={(e) => setThingTitle(e.target.value)}
      />
      <FormField
        label="Base"
        placeholder="http://www.example.com/thing-path"
        id="thing-base"
        type="url"
        autoFocus={false}
        value={thingBase}
        onChange={(e) => setThingBase(e.target.value)}
      />
      <label
        htmlFor="thing-description"
        className="pl-2 text-sm font-medium text-gray-400"
      >
        Description:
      </label>
      <textarea
        id="thing-description"
        rows={5}
        className="w-full appearance-none rounded border-2 border-gray-600 bg-gray-600 p-2 leading-tight text-white focus:border-blue-500 focus:outline-none sm:text-sm"
        placeholder="A short description about this new Thing..."
        value={thingDescription}
        onChange={(e) => setThingDescription(e.target.value)}
      />
      <label
        htmlFor="thing-security"
        className="pl-2 text-sm font-medium text-gray-400"
      >
        Security:
      </label>
      <div className="relative mb-8">
        <select
          className="block w-full appearance-none rounded border-2 border-gray-600 bg-gray-600 px-4 py-3 pr-8 leading-tight text-white focus:border-blue-500 focus:outline-none"
          id="thing-security"
          value={thingSecurity}
          onChange={(e) => setThingSecurity(e.target.value)}
        >
          <option>nosec</option>
          <option>basic</option>
          <option>digest</option>
          <option>bearer</option>
          <option>psk</option>
          <option>oauth2</option>
          <option>apikey</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <ChevronDown color="#cacaca" />
        </div>
      </div>

      <div className="pt-2">
        <label
          htmlFor="submit-csv"
          className="pl-2 text-sm font-medium text-gray-400"
        >
          Add properties in CSV format:
        </label>
      </div>

      <div className="flex flex-col justify-between rounded border-2 border-gray-600">
        <div className="flex items-center p-2">
          <label
            htmlFor="protocol-option"
            className="pl-2 pr-2 text-lg text-gray-400"
          >
            Protocol:
          </label>

          <div className="relative">
            <select
              id="protocol-option"
              className="block appearance-none rounded border-2 border-gray-600 bg-gray-600 px-1 py-2 pr-4 leading-tight text-white hover:border-blue-500 focus:outline-none"
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
            >
              <option>Modbus TCP</option>
              <option disabled>
                More protocols will be supported in the future
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-2 text-gray-700">
              <ChevronDown color="#cacaca" />
            </div>
          </div>
        </div>

        <div className="flex items-center p-2">
          <BaseButton
            id="download-template"
            onClick={handleDownloadCsvTemplate}
            variant="primary"
            type="button"
          >
            Download CSV Template
          </BaseButton>

          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <BaseButton
            id="submit-csv"
            onClick={triggerFileDialog}
            variant="primary"
            type="button"
            className="ml-2"
          >
            Load a CSV File
          </BaseButton>
          <div className="ml-2">
            <p className="pl-2">{fileName || "No file selected"}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateTd;
