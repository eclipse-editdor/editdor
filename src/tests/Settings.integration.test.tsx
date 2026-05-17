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
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App from "../App";
import { decompressSharedTd } from "../share";

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
  default: ({ jsonIndentation }: { jsonIndentation: 2 | 4 }) => (
    <output data-testid="editor-json-indentation">{jsonIndentation}</output>
  ),
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

const renderSettingsIntegration = () => render(<App />);

describe("Settings integration", () => {
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

  test("only updates JsonEditor indentation after the user saves", () => {
    renderSettingsIntegration();

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    const indentationSelect = screen.getByLabelText(/space indentation/i);

    expect(screen.getByTestId("editor-json-indentation")).toHaveTextContent(
      "2"
    );
    expect(indentationSelect).toHaveValue("2");

    fireEvent.change(indentationSelect, { target: { value: "4" } });

    expect(screen.getByTestId("editor-json-indentation")).toHaveTextContent(
      "2"
    );
    expect(indentationSelect).toHaveValue("4");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(screen.getByTestId("editor-json-indentation")).toHaveTextContent(
      "4"
    );
  });

  test("discards an unsaved indentation change when the user cancels", () => {
    renderSettingsIntegration();

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    fireEvent.change(screen.getByLabelText(/space indentation/i), {
      target: { value: "4" },
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByTestId("editor-json-indentation")).toHaveTextContent(
      "2"
    );

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(screen.getByLabelText(/space indentation/i)).toHaveValue("2");
  });
});
