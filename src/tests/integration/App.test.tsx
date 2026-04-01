/********************************************************************************
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../../App";
import ediTDorContext from "../../context/ediTDorContext";
import { decompressSharedTd } from "../../share";
import {
  THING_DESCRIPTION_LAMP_V_STRING,
  THING_DESCRIPTION_LAMP_JSON,
} from "./constants";

vi.mock("../../components/Editor/JsonEditor", () => ({
  default: () => {
    const { offlineTD } = useContext(ediTDorContext);

    return <pre data-testid="offline-td">{offlineTD}</pre>;
  },
}));

vi.mock("../../components/TDViewer/TDViewer", () => ({
  default: () => <div>TDViewer</div>,
}));

vi.mock("../../share", () => ({
  decompressSharedTd: vi.fn(),
}));

vi.mock("@column-resizer/react", () => ({
  Container: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Section: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Bar: () => <div data-testid="resize-bar" />,
}));

vi.mock("../../components/Dialogs/ConvertTmDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/Dialogs/CreateTdDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/Dialogs/ShareDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/Dialogs/ContributeToCatalogDialog", () => ({
  default: () => null,
}));

vi.mock("../../components/Dialogs/SendTDDialog", () => ({
  default: () => null,
}));

const mockedDecompressSharedTd = vi.mocked(decompressSharedTd);

describe("Integration test on params in the URI", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: null,
    });

    Object.defineProperty(window, "confirm", {
      configurable: true,
      writable: true,
      value: vi.fn(() => true),
    });

    class ResizeObserverMock {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    mockedDecompressSharedTd.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  test("reads northbound, southbound and value path from url params and shows them in Settings", () => {
    window.history.replaceState(
      {},
      "",
      "/?northbound=http://localhost:8080&southbound=http://localhost:9090&valuePath=/foo/bar"
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    const northboundInput = screen.getByLabelText(/target url northbound/i);
    const southboundInput = screen.getByLabelText(/target url southbound/i);
    const valuePathInput = screen.getByLabelText(/json pointer path/i);

    expect(northboundInput).toHaveValue("http://localhost:8080/");
    expect(southboundInput).toHaveValue("http://localhost:9090/");
    expect(valuePathInput).toHaveValue("/foo/bar");
  });
  test("reads northbound, southbound and value path with slashes from url params and shows them in Settings", () => {
    window.history.replaceState(
      {},
      "",
      "/?northbound=http://localhost:8080/&southbound=http://localhost:9090/&valuePath=/foo/bar"
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    const northboundInput = screen.getByLabelText(/target url northbound/i);
    const southboundInput = screen.getByLabelText(/target url southbound/i);
    const valuePathInput = screen.getByLabelText(/json pointer path/i);

    expect(northboundInput).toHaveValue("http://localhost:8080/");
    expect(southboundInput).toHaveValue("http://localhost:9090/");
    expect(valuePathInput).toHaveValue("/foo/bar");
  });

  test("loads a TD from the td query param into the editor state", async () => {
    mockedDecompressSharedTd.mockReturnValue(THING_DESCRIPTION_LAMP_JSON);

    window.history.replaceState({}, "", "/?td=compressed-value");

    render(<App />);

    await waitFor(() => {
      expect(mockedDecompressSharedTd).toHaveBeenCalledWith("compressed-value");
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"title": "MyLampThing"'
      );
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"id": "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06"'
      );
    });
  });

  test("loads a TD from local storage when the localstorage query param is present", async () => {
    localStorage.setItem("td", THING_DESCRIPTION_LAMP_V_STRING);

    window.history.replaceState({}, "", "/?localstorage=1");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"title": "MyLampThing"'
      );
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"id": "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06"'
      );
    });
  });

  test("ignores proxyEndpoint and southboundTdId when no TD source is provided", async () => {
    window.history.replaceState(
      {},
      "",
      "/?proxyEndpoint=http://localhost:3000&southboundTdId=device-7"
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent("");
    });

    expect(mockedDecompressSharedTd).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/couldn't be reconstructed/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/request to read td from local storage failed/i)
    ).not.toBeInTheDocument();
  });

  test("still loads the td query param when proxyEndpoint and southboundTdId are also present", async () => {
    mockedDecompressSharedTd.mockReturnValue(THING_DESCRIPTION_LAMP_JSON);

    window.history.replaceState(
      {},
      "",
      "/?td=combined&proxyEndpoint=http://localhost:3000&southboundTdId=device-7"
    );

    render(<App />);

    await waitFor(() => {
      expect(mockedDecompressSharedTd).toHaveBeenCalledWith("combined");
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"title": "MyLampThing"'
      );
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"id": "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06"'
      );
    });
  });

  test("still loads the local storage TD when southboundTdId is also present", async () => {
    localStorage.setItem("td", THING_DESCRIPTION_LAMP_V_STRING);

    window.history.replaceState(
      {},
      "",
      "/?localstorage=1&southboundTdId=device-7"
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"title": "MyLampThing"'
      );
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"id": "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06"'
      );
    });
  });
});
