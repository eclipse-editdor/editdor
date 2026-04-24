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
import React from "react";
import { Copy, Trash2 } from "react-feather";

interface IProps {
  onCopy: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  copyTitle: string;
  deleteTitle: string;
}

const AffordanceButtons: React.FC<IProps> = ({
  onCopy,
  onDelete,
  copyTitle,
  deleteTitle,
}) => {
  return (
    <div className="flex self-stretch">
      <button
        className="flex w-14 items-center justify-center bg-gray-400 transition-colors hover:bg-gray-500"
        title={copyTitle}
        onClick={onCopy}
      >
        <Copy size={20} color="white" />
      </button>

      <button
        className="flex w-14 items-center justify-center rounded-tr-lg border-l border-gray-500 bg-gray-400 transition-colors hover:bg-gray-500"
        title={deleteTitle}
        onClick={onDelete}
      >
        <Trash2 size={20} color="white" />
      </button>
    </div>
  );
};

export default AffordanceButtons;
