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
import type { FormElementBase } from "wot-thing-description-types";

declare global {
  declare const APP_VERSION: string;

  declare module "*.png" {
    const value: string;
    export default value;
  }

  declare module "*.png" {
    const value: string;
    export default value;
  }

  declare type ThingDescription = WoT.ThingDescription;

  declare type Method = "GET" | "POST" | "PUT" | "DELETE";

  declare interface RequestWebOptions extends RequestInit {
    queryParams?: Record<string, string | number | boolean>;
  }

  declare interface HttpSuccessResponse {
    data: Response;
    headers: string;
    status: number;
  }

  declare interface HttpErrorResponse {
    message: string;
    reason: string;
    status?: number;
  }

  declare type HttpResponse = HttpSuccessResponse | HttpErrorResponse;

  declare interface ResponseDataFromNorthbound {
    [key: string]: unknown;
    id?: string;
    value?: unknown;
    timestamp?: number;
    quality?: number;
  }
}

export type InteractionKey = "actions" | "properties" | "events";

export {};
