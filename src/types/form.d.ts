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
import { ThingDescription } from "wot-thing-description-types";

type ServientCallback = (
  td: ThingDescription,
  propertyName: string,
  content: any,
  valuePath: string
) => Promise<{ result: string; err: Error | null }>;

export interface IFormConfigurations {
  color: string;
  title: string;
  level: "thing" | "properties" | "actions" | "events";
  callback: ServientCallback | null;
}

export interface IInteractionForm {
  href: string;
  op?: string | string[];
  contentType?: string;
  [key: string]: unknown;
}

export interface IExplicitForm extends IInteractionForm {
  op: string | string[];
}

export interface IInteractionAffordance {
  title?: string;
  description?: string;
  type?: string;
  forms?: IInteractionForm[];
  [key: string]: unknown;
}

export type IFormProps = IInteractionForm & {
  actualIndex: number;
  [key: string]: unknown;
};

export type OpKeys =
  | "readproperty"
  | "writeproperty"
  | "observeproperty"
  | "unobserveproperty"
  | "invokeaction"
  | "subscribeevent"
  | "unsubscribeevent"
  | "readmultipleproperties"
  | "readallproperties"
  | "writemultipleproperties"
  | "writeallproperties"
  | "observeallproperties"
  | "unobserveallproperties";
