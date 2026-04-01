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
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { decompressSharedTd } from "./share";
import App from "./App";

vi.mock("./components/Editor/JsonEditor", () => ({
  default: () => <div>JsonEditor</div>,
}));

vi.mock("./components/TDViewer/TDViewer", () => ({
  default: () => <div>TDViewer</div>,
}));

vi.mock("./components/App/AppHeader", () => ({
  default: () => <div>AppHeader</div>,
}));

vi.mock("./components/App/AppFooter", () => ({
  default: () => <div>AppFooter</div>,
}));

vi.mock("./components/Dialogs/ErrorDialog", () => ({
  default: ({
    isOpen,
    errorMessage,
  }: {
    isOpen: boolean;
    errorMessage: string;
  }) => (isOpen ? <div>{errorMessage}</div> : null),
}));

vi.mock("./components/Dialogs/DialogTemplate", () => ({
  default: ({
    title,
    description,
    onHandleEventRightButton,
    onHandleEventLeftButton,
  }: {
    title: string;
    description: string;
    onHandleEventRightButton: () => void;
    onHandleEventLeftButton: () => void;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
      <button onClick={onHandleEventRightButton}>Confirm</button>
      <button onClick={onHandleEventLeftButton}>Cancel</button>
    </div>
  ),
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

vi.mock("./share", () => ({
  decompressSharedTd: vi.fn(),
}));

const mockedDecompressSharedTd = vi.mocked(decompressSharedTd);

const dispatchAppMessage = ({
  origin = "http://localhost:5175",
  source = null,
  data,
}: {
  origin?: string;
  source?: object | null;
  data: unknown;
}) => {
  const event = new MessageEvent("message", {
    origin,
    data,
  });

  Object.defineProperty(event, "source", {
    configurable: true,
    value: source,
  });

  window.dispatchEvent(event);
};

describe("App - component test", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: null,
    });

    class ResizeObserverMock {
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  test("renders the basic app shell", () => {
    render(<App />);

    expect(screen.getByText("AppHeader")).toBeInTheDocument();
    expect(screen.getByText("TDViewer")).toBeInTheDocument();
    expect(screen.getByText("JsonEditor")).toBeInTheDocument();
    expect(screen.getByText("AppFooter")).toBeInTheDocument();
  });

  test("shows an error when localstorage query param exists but td is missing", () => {
    window.history.replaceState({}, "", "/?localstorage=1");

    render(<App />);

    expect(
      screen.getByText("Request to read TD from local storage failed.")
    ).toBeInTheDocument();
  });
  test("shows an error when td query param cannot be decompressed", () => {
    window.history.replaceState({}, "", "/?td=compressed-value");
    mockedDecompressSharedTd.mockReturnValue(undefined);

    render(<App />);

    expect(mockedDecompressSharedTd).toHaveBeenCalledWith("compressed-value");
    expect(
      screen.getByText(
        "The lz compressed TD found in the URL couldn't be reconstructed."
      )
    ).toBeInTheDocument();
  });

  test("notifies the opener that editdor is ready", () => {
    const postMessage = vi.fn();

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: { postMessage },
    });

    render(<App />);

    expect(postMessage).toHaveBeenCalledWith(
      { type: "EDITDOR_READY" },
      "http://localhost:5175"
    );
  });

  test("ignores messages from the wrong origin", () => {
    const openerRef = { postMessage: vi.fn() };

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    dispatchAppMessage({
      origin: "http://malicious.example",
      source: openerRef,
      data: {
        type: "LOAD_TD",
        description: "Imported TD",
        payload: '{"title":"Imported Thing"}',
      },
    });

    expect(
      screen.queryByText(
        'The Thing Description "Imported TD" was received from the other application.'
      )
    ).not.toBeInTheDocument();
  });

  test("ignores messages from a source other than window.opener", () => {
    const openerRef = { postMessage: vi.fn() };
    const otherSource = {};

    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: openerRef,
    });

    render(<App />);

    dispatchAppMessage({
      source: otherSource,
      data: {
        type: "LOAD_TD",
        description: "Imported TD",
        payload: '{"title":"Imported Thing"}',
      },
    });

    expect(
      screen.queryByText(
        'The Thing Description "Imported TD" was received from the other application.'
      )
    ).not.toBeInTheDocument();
  });
});
