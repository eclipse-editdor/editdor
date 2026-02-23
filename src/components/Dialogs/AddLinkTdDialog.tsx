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
import React, {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
} from "react";
import ReactDOM from "react-dom";
import ediTDorContext from "../../context/ediTDorContext";
import * as fileTdService from "../../services/fileTdService";
import { checkIfLinkIsInItem } from "../../utils/tdOperations";
import DialogTemplate from "./DialogTemplate";
import BaseButton from "../../components/TDViewer/base/BaseButton";

export interface AddLinkTdDialogRef {
  openModal: () => void;
  close: () => void;
}

interface Link {
  href: string;
  rel?: string;
  type?: string;
}

interface AddLinkTdDialogProps {
  interaction?: { links?: Link[] };
}

const AddLinkTdDialog = forwardRef<AddLinkTdDialogRef, AddLinkTdDialogProps>(
  (props, ref) => {
    const context = useContext(ediTDorContext);
    const [display, setDisplay] = React.useState<boolean>(() => {
      return false;
    });
    const [linkingMethod, setlinkingMethod] = React.useState<string>(() => {
      return "url";
    });
    const [currentLinkedTd, setCurrentLinkedTd] = React.useState<
      Record<string, any>
    >(() => {
      return {};
    });

    const interaction = props.interaction ?? {};
    const tdJSON = context.parsedTD;

    useImperativeHandle(ref, () => {
      return {
        openModal: () => open(),
        close: () => close(),
      };
    });

    const open = () => {
      setDisplay(true);
    };

    const close = () => {
      setDisplay(false);
    };

    const checkIfLinkExists = (link: Link): boolean => {
      if (!interaction.links) {
        return false;
      }

      return checkIfLinkIsInItem(link, interaction);
    };

    const addLinksToTd = (link: Link): void => {
      // clone instead of mutating original TD
      const updatedTd = structuredClone(context.parsedTD);
      // initialize links array if missing
      if (!Array.isArray(updatedTd.links)) {
        updatedTd.links = [];
      }
      updatedTd.links.push(link);
      context.updateOfflineTD(JSON.stringify(updatedTd, null, 2));
    };

    const linkingMethodChange = (linkingOption: string): void => {
      setlinkingMethod(linkingOption);
      if (currentLinkedTd && linkingOption === "url") {
        setCurrentLinkedTd({});
      }
    };

    const openFile = useCallback(async () => {
      try {
        const res = await fileTdService.readFromFile();

        (document.getElementById("link-href") as HTMLInputElement).value =
          `./${res.fileName}`;
        setCurrentLinkedTd(
          res.fileHandle ? res.fileHandle : JSON.parse(res.td)
        );
      } catch (error) {
        const msg = "We ran into an error trying to open your TD.";
        console.error(msg, error);
        alert(msg);
      }
    }, []);

    const RelationType = (): JSX.Element[] => {
      const relations = [
        "icon",
        "service-doc",
        "alternate",
        "type",
        "tm:extends",
        "proxy-to",
        "collection",
        "item",
        "predecessor-version",
        "controlledBy",
      ];
      let index = 0;
      const relationsHtml = relations.map((currentRelation) => {
        index++;
        return <option value={currentRelation} key={index} />;
      });
      return relationsHtml;
    };

    const children = (
      <>
        <label className="pl-3 text-sm font-medium text-gray-400">
          Thing Description:
        </label>
        <div className="p-1">{tdJSON["title"]}</div>
        <div className="p-1 pt-2">
          <label
            htmlFor="rel"
            className="pl-2 text-sm font-medium text-gray-400"
          >
            Relation:(select one of the proposed relations or type your custom
            relation)
          </label>
          <input
            list="relationType"
            type="text"
            name="rel"
            id="rel"
            className="w-full rounded-md border-2 border-gray-600 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm"
            placeholder="relation name"
          />
          <datalist id="relationType">
            <RelationType></RelationType>
          </datalist>

          <span id="link-rel-info" className="pl-2 text-xs text-red-400"></span>
        </div>
        <div className="p-1 pt-2">
          <label
            htmlFor="link-href"
            className="pl-2 pr-2 text-sm font-medium text-gray-400"
          >
            Target ressource:
          </label>

          <BaseButton
            type="button"
            disabled={linkingMethod === "upload"}
            onClick={() => linkingMethodChange("upload")}
            className="h-9"
            variant="primary"
          >
            From local machine
          </BaseButton>

          <BaseButton
            type="button"
            disabled={linkingMethod === "url"}
            onClick={() => linkingMethodChange("url")}
            className="ml-2 h-9"
            variant="primary"
          >
            Resource url
          </BaseButton>
          <div className="p-1 pt-4">
            <input
              type="text"
              name="link-href"
              id="link-href"
              className="rounded-md border-2 border-gray-600 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm"
              placeholder="The target ressource"
              onChange={() => {
                clearHrefErrorMessage();
              }}
              disabled={linkingMethod !== "url"}
            />
            {linkingMethod === "upload" && (
              <BaseButton
                type="button"
                onClick={openFile}
                disabled={linkingMethod !== "upload"}
                className="ml-2 h-9"
                variant="primary"
              >
                Open TD
              </BaseButton>
            )}
          </div>
          <span
            id="link-href-info"
            className="pl-2 text-xs text-red-400"
          ></span>
          <div>
            <label
              htmlFor="type"
              className="pl-2 text-sm font-medium text-gray-400"
            >
              Type:(select one of the proposed types or tape your custom type)
            </label>
            <input
              list="mediaType"
              type="text"
              name="type"
              id="type"
              className="w-full rounded-md border-2 border-gray-600 bg-gray-600 p-2 text-white focus:border-blue-500 focus:outline-none sm:text-sm"
              placeholder="media type"
            />
            <datalist id="mediaType">
              <option value="application/td+json" />
              <option value="image/jpeg" />
              <option value="text/csv" />
              <option value="video/mp4" />
            </datalist>
          </div>
        </div>
      </>
    );

    const handleAddLink = () => {
      if (!context.isValidJSON) {
        showHrefErrorMessage("Can't add link. TD is malformed");
        return;
      }

      const linkedTd: Record<string, any> = {};

      const link: Link = {
        href:
          (
            document.getElementById("link-href") as HTMLInputElement
          ).value.trim() || "/",
      };
      const rel = (
        document.getElementById("rel") as HTMLInputElement
      ).value.trim();
      const type = (
        document.getElementById("type") as HTMLInputElement
      ).value.trim();

      if (rel) link.rel = rel;
      if (type) link.type = type;

      let isValidUrl = true;
      try {
        var url = new URL(link.href);
      } catch (_) {
        isValidUrl = false;
      }
      if (
        linkingMethod === "url" &&
        isValidUrl &&
        (url.protocol === "http:" || url.protocol === "https:")
      ) {
        try {
          var httpRequest = new XMLHttpRequest();
          httpRequest.open("GET", link.href, false);
          httpRequest.send();
          if (
            httpRequest
              .getResponseHeader("content-type")
              .includes("application/td+json")
          ) {
            const thingDescription = httpRequest.response;
            let parsedTd = JSON.parse(thingDescription);
            linkedTd[link.href] = parsedTd;
          }
        } catch (ex) {
          const msg = "We ran into an error trying to fetch your TD.";
          console.error(msg, ex);
          linkedTd[link.href] = currentLinkedTd;
        }
      } else {
        linkedTd[link.href] = currentLinkedTd;
      }

      if (link.href === "") {
        showHrefErrorMessage("The href field is mandatory ...");
      } else if (checkIfLinkExists(link)) {
        showHrefErrorMessage(
          "A Link with the target Thing Description already exists ..."
        );
      } else {
        addLinksToTd(link);
        context.addLinkedTd(linkedTd);
        setCurrentLinkedTd({});
        close();
      }
    };

    if (display) {
      return ReactDOM.createPortal(
        <DialogTemplate
          onHandleEventLeftButton={close}
          onHandleEventRightButton={handleAddLink}
          rightButton={"Add"}
          children={children}
          title={`Add Link `}
          description={`Tell us how this ${tdJSON.title} can interact with other ressources`}
        />,
        document.getElementById("modal-root") as HTMLElement
      );
    }

    return null;
  }
);

const showHrefErrorMessage = (msg) => {
  (document.getElementById("link-href-info") as HTMLElement).textContent = msg;
  (document.getElementById("link-href") as HTMLElement).classList.remove(
    "border-gray-600"
  );
  (document.getElementById("link-href") as HTMLElement).classList.add(
    "border-red-400"
  );
};

const clearHrefErrorMessage = () => {
  (document.getElementById("link-href") as HTMLElement).classList.add(
    "border-gray-600"
  );
  (document.getElementById("link-href") as HTMLElement).classList.remove(
    "border-red-400"
  );
};

AddLinkTdDialog.displayName = "AddLinkTdDialog";
export default AddLinkTdDialog;
