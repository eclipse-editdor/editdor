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
import React, { useContext } from "react";
import ediTDorContext from "../../../context/ediTDorContext";
import FormDetails from "../base/FormDetails";
import UndefinedForm from "../base/UndefinedForm";
import { formConfigurations } from "../../../services/form";
import type { FormProps, OpKeys } from "../../../types/form";

const typeToJSONKey = (type: string): string => {
  const typeToJSONKey: Record<string, string> = {
    action: "actions",
    property: "properties",
    event: "events",
    thing: "thing",
  };

  return typeToJSONKey[type];
};

interface IFormComponentProps {
  form: FormProps;
  propName: string;
  interactionType: "thing" | "property" | "action" | "event";
}

const Form: React.FC<IFormComponentProps> = (props): JSX.Element => {
  const context = useContext(ediTDorContext);

  const newForm = {
    ...props.form,
    propName: props.propName,
  };

  const usesNorthBoundConnection: boolean =
    Object.keys(context.northboundConnection.northboundTd).length > 0;

  const fc = formConfigurations[newForm.op as string];
  if (!fc) {
    return (
      <UndefinedForm
        level={typeToJSONKey(props.interactionType)}
        form={newForm}
      />
    );
  }

  return (
    <>
      <FormDetails
        operationType={newForm.op as OpKeys}
        form={newForm}
        interactionFunction={fc.callback}
        usesNorthboundConnection={usesNorthBoundConnection}
      />
    </>
  );
};

export default Form;
