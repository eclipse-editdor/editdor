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
  act,
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../App";
import ediTDorContext from "../context/ediTDorContext";
import { decompressSharedTd } from "../share";
import {
  THING_DESCRIPTION_LAMP_V_STRING,
  THING_DESCRIPTION_LAMP_JSON,
} from "./constants";

vi.mock("@node-wot/browser-bundle", () => ({
  Core: {
    Servient: vi.fn().mockImplementation(() => ({
      addClientFactory: vi.fn(),
      start: vi.fn().mockResolvedValue({
        consume: vi.fn(),
      }),
    })),
  },
  Http: {
    HttpClientFactory: vi.fn(),
  },
}));

vi.mock("../components/Editor/JsonEditor", () => ({
  default: () => {
    const { offlineTD } = useContext(ediTDorContext);

    return <pre data-testid="offline-td">{offlineTD}</pre>;
  },
}));

vi.mock("../components/TDViewer/TDViewer", () => ({
  default: () => <div>TDViewer</div>,
}));

vi.mock("../share", () => ({
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

vi.mock("../components/Dialogs/ConvertTmDialog", async () => {
  const React = await import("react");

  const MockConvertTmDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
      close: () => undefined,
    }));

    return null;
  });

  return { default: MockConvertTmDialog };
});

vi.mock("../components/Dialogs/CreateTdDialog", async () => {
  const React = await import("react");

  const MockCreateTdDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
    }));

    return null;
  });

  return { default: MockCreateTdDialog };
});

vi.mock("../components/Dialogs/ShareDialog", async () => {
  const React = await import("react");

  const MockShareDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
    }));

    return null;
  });

  return { default: MockShareDialog };
});

vi.mock("../components/Dialogs/ContributeToCatalogDialog", async () => {
  const React = await import("react");

  const MockContributeToCatalogDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
      close: () => undefined,
    }));

    return null;
  });

  return { default: MockContributeToCatalogDialog };
});

vi.mock("../components/Dialogs/SendTDDialog", async () => {
  const React = await import("react");

  const MockSendTdDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
      close: () => undefined,
    }));

    return null;
  });

  return { default: MockSendTdDialog };
});

const mockedDecompressSharedTd = vi.mocked(decompressSharedTd);

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

describe("App component URL bootstrapping logic", () => {
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
  test("shows an error when localstorage query param exists but td is missing", async () => {
    window.history.replaceState({}, "", "/?localstorage=1");

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/request to read td from local storage failed/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("offline-td")).toHaveTextContent("");
  });

  test("loads invalid JSON from local storage as raw text and shows an error", async () => {
    localStorage.setItem("td", "not-json");

    window.history.replaceState({}, "", "/?localstorage=1");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent("not-json");
      expect(
        screen.getByText(
          /tried to json parse the td from local storage, but failed/i
        )
      ).toBeInTheDocument();
    });
  });
  test("does nothing when no relevant URL params are present", async () => {
    window.history.replaceState({}, "", "/");

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
  test("shows an error when the td query param cannot be decompressed", async () => {
    mockedDecompressSharedTd.mockReturnValue(undefined);

    window.history.replaceState({}, "", "/?td=broken-value");

    render(<App />);

    await waitFor(() => {
      expect(mockedDecompressSharedTd).toHaveBeenCalledWith("broken-value");
      expect(
        screen.getByText(
          /the lz compressed td found in the url couldn't be reconstructed/i
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("offline-td")).toHaveTextContent("");
  });
  test("loads local storage after td when both query params are present", async () => {
    mockedDecompressSharedTd.mockReturnValue({
      title: "FromCompressedTd",
      id: "urn:compressed",
    });

    localStorage.setItem("td", THING_DESCRIPTION_LAMP_V_STRING);

    window.history.replaceState({}, "", "/?td=compressed-value&localstorage=1");

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

    expect(screen.getByTestId("offline-td")).not.toHaveTextContent(
      '"title": "FromCompressedTd"'
    );
  });
  test("does not read local storage when td decompression fails even if localstorage is present", async () => {
    mockedDecompressSharedTd.mockReturnValue(undefined);
    localStorage.setItem("td", THING_DESCRIPTION_LAMP_V_STRING);

    window.history.replaceState({}, "", "/?td=broken-value&localstorage=1");

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /the lz compressed td found in the url couldn't be reconstructed/i
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("offline-td")).toHaveTextContent("");
  });
  test("shows an error when persisting URL params to local storage fails", async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("storage failed");
      });

    window.history.replaceState(
      {},
      "",
      "/?northbound=http://localhost:8080&southbound=http://localhost:9090&valuePath=/foo/bar"
    );

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to persist url parameters to local storage/i)
      ).toBeInTheDocument();
    });

    setItemSpy.mockRestore();
  });
});

describe("App component receive message from other application", () => {
  test("notifies the opener that editdor is ready on mount", () => {
    const openerRef = {
      postMessage: vi.fn(),
    };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    expect(openerRef.postMessage).toHaveBeenCalledWith(
      {
        type: "EDITDOR_READY",
      },
      "*"
    );
  });
  test("loads a TD received from the other application after confirmation", async () => {
    const openerRef = {
      postMessage: vi.fn(),
    };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    const event = new MessageEvent("message", {
      origin: "http://localhost:5175",
      data: {
        type: "LOAD_TD",
        description: "Imported TD",
        payload: THING_DESCRIPTION_LAMP_V_STRING,
      },
    });

    Object.defineProperty(event, "source", {
      configurable: true,
      value: openerRef,
    });

    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(
      await screen.findByText(
        'The Thing Description "Imported TD" was received from the other application.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"title": "MyLampThing"'
      );
      expect(screen.getByTestId("offline-td")).toHaveTextContent(
        '"id": "urn:uuid:0804d572-cce8-422a-bb7c-4412fcd56f06"'
      );
    });
  });
  test("ignores LOAD_TD messages from a source other than window.opener", async () => {
    const openerRef = { postMessage: vi.fn() };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    const event = new MessageEvent("message", {
      origin: "http://localhost:5175",
      data: {
        type: "LOAD_TD",
        description: "Imported TD",
        payload: THING_DESCRIPTION_LAMP_V_STRING,
      },
    });

    Object.defineProperty(event, "source", {
      configurable: true,
      value: {},
    });

    await act(async () => {
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent("");
    });

    expect(
      screen.queryByText(/received from the other application/i)
    ).not.toBeInTheDocument();
  });
  test("shows an error when the other application sends invalid JSON", async () => {
    const openerRef = { postMessage: vi.fn() };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    const event = new MessageEvent("message", {
      origin: "http://localhost:5175",
      data: {
        type: "LOAD_TD",
        description: "Broken TD",
        payload: "not-json",
      },
    });

    Object.defineProperty(event, "source", {
      configurable: true,
      value: openerRef,
    });

    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(
      await screen.findByText(
        /received invalid json from the other application/i
      )
    ).toBeInTheDocument();

    expect(screen.getByTestId("offline-td")).toHaveTextContent("");
  });
  test("does not load the received TD when the user cancels", async () => {
    const openerRef = { postMessage: vi.fn() };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    const event = new MessageEvent("message", {
      origin: "http://localhost:5175",
      data: {
        type: "LOAD_TD",
        description: "Imported TD",
        payload: THING_DESCRIPTION_LAMP_V_STRING,
      },
    });

    Object.defineProperty(event, "source", {
      configurable: true,
      value: openerRef,
    });

    await act(async () => {
      window.dispatchEvent(event);
    });

    expect(
      await screen.findByText(
        'The Thing Description "Imported TD" was received from the other application.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent("");
    });

    expect(
      screen.queryByText(/received from the other application/i)
    ).not.toBeInTheDocument();
  });
  test("ignores messages that are not valid LOAD_TD payloads", async () => {
    const openerRef = { postMessage: vi.fn() };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    const event = new MessageEvent("message", {
      origin: "http://localhost:5175",
      data: { type: "LOAD_TD", payload: THING_DESCRIPTION_LAMP_V_STRING },
    });

    Object.defineProperty(event, "source", {
      configurable: true,
      value: openerRef,
    });

    await act(async () => {
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(screen.getByTestId("offline-td")).toHaveTextContent("");
    });

    expect(
      screen.queryByText(/received from the other application/i)
    ).not.toBeInTheDocument();
  });
});
