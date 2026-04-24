import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import InteractionSection from "../components/TDViewer/components/InteractionSection";
import ediTDorContext from "../context/ediTDorContext";
import { editdorReducer } from "../context/editorReducers";
import {
  THING_DESCRIPTION_LAMP_JSON,
  THING_DESCRIPTION_LAMP_V_STRING,
  createContextValue,
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

vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor" />,
}));

vi.mock("../components/Dialogs/AddActionDialog", async () => {
  const React = await import("react");

  const MockAddActionDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ openModal: () => undefined }));
    return null;
  });

  return { default: MockAddActionDialog };
});

vi.mock("../components/Dialogs/AddEventDialog", async () => {
  const React = await import("react");

  const MockAddEventDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ openModal: () => undefined }));
    return null;
  });

  return { default: MockAddEventDialog };
});

vi.mock("../components/Dialogs/AddPropertyDialog", async () => {
  const React = await import("react");

  const MockAddPropertyDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ openModal: () => undefined }));
    return null;
  });

  return { AddPropertyDialog: MockAddPropertyDialog };
});

vi.mock("../components/Dialogs/AddFormDialog", async () => {
  const React = await import("react");

  const MockAddFormDialog = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      openModal: () => undefined,
      close: () => undefined,
    }));
    return null;
  });

  return { default: MockAddFormDialog };
});

vi.mock("../components/Dialogs/ErrorDialog", () => ({
  default: () => null,
}));

vi.mock("../components/Dialogs/DialogTemplate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../components/TDViewer/components/EditProperties", () => ({
  default: () => null,
}));

const createInitialEditorState = (): EditorState => {
  const value = createContextValue({
    offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
    parsedTD: structuredClone(THING_DESCRIPTION_LAMP_JSON),
    isValidJSON: true,
    name: THING_DESCRIPTION_LAMP_JSON.title,
  });

  return {
    offlineTD: value.offlineTD,
    isValidJSON: value.isValidJSON,
    parsedTD: value.parsedTD,
    isModified: value.isModified,
    name: value.name,
    fileHandle: value.fileHandle,
    linkedTd: value.linkedTd,
    validationMessage: value.validationMessage,
    northboundConnection: value.northboundConnection,
    contributeCatalog: value.contributeCatalog,
  };
};

const TestContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = React.useReducer(
    editdorReducer,
    undefined,
    createInitialEditorState
  );

  const contextValue = createContextValue({
    offlineTD: state.offlineTD,
    isValidJSON: state.isValidJSON,
    parsedTD: state.parsedTD,
    isModified: state.isModified,
    name: state.name,
    fileHandle: state.fileHandle,
    linkedTd: state.linkedTd,
    validationMessage: state.validationMessage,
    northboundConnection: state.northboundConnection,
    contributeCatalog: state.contributeCatalog,
    updateOfflineTD: (offlineTD: string) => {
      dispatch({ type: "UPDATE_OFFLINE_TD", offlineTD });
    },
    removeOneOfAKindReducer: (
      kind: "properties" | "actions" | "events" | string,
      oneOfAKindName: string
    ) => {
      dispatch({ type: "REMOVE_ONE_OF_A_KIND_FROM_TD", kind, oneOfAKindName });
    },
  });

  return (
    <ediTDorContext.Provider value={contextValue}>
      {children}
    </ediTDorContext.Provider>
  );
};

const OfflineTdProbe: React.FC = () => {
  const { offlineTD } = React.useContext(ediTDorContext);

  return <pre data-testid="offline-td">{offlineTD}</pre>;
};

const getOfflineTdJson = () => {
  const offlineTd = screen.getByTestId("offline-td").textContent ?? "{}";

  return JSON.parse(offlineTd);
};

describe("InteractionSection affordance flows", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  test("copies a property, opens the new affordance, and highlights it", async () => {
    render(
      <TestContextProvider>
        <InteractionSection interaction="Properties" />
        <OfflineTdProbe />
      </TestContextProvider>
    );

    fireEvent.click(screen.getByText("status"));
    const copyButton = await screen.findByRole("button", {
      name: /copy property/i,
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      const td = getOfflineTdJson();

      expect(td.properties).toHaveProperty("status");
      expect(td.properties).toHaveProperty("status_copy");
      expect(td.actions).toHaveProperty("toggle");
      expect(td.events).toHaveProperty("overheating");
    });

    await waitFor(() => {
      expect(screen.getByText("status_copy")).toBeInTheDocument();
    });

    const copiedAffordance = document.getElementById("property-status_copy");

    expect(copiedAffordance).toHaveAttribute("open");
    expect(copiedAffordance).toHaveClass("border-green-400");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  test("copies an action, opens the new affordance, and updates parsed offlineTd", async () => {
    render(
      <TestContextProvider>
        <InteractionSection interaction="Actions" />
        <OfflineTdProbe />
      </TestContextProvider>
    );

    fireEvent.click(screen.getByText("toggle"));

    fireEvent.click(
      await screen.findByRole("button", { name: /copy action/i })
    );

    await waitFor(() => {
      const td = getOfflineTdJson();

      expect(td.actions).toHaveProperty("toggle");
      expect(td.actions).toHaveProperty("toggle_copy");
      expect(td.properties).toHaveProperty("status");
    });

    await waitFor(() => {
      expect(screen.getByText("toggle_copy")).toBeInTheDocument();
    });

    const copiedAffordance = document.getElementById("action-toggle_copy");

    expect(copiedAffordance).toHaveAttribute("open");
    expect(copiedAffordance).toHaveClass("border-green-400");
  });

  test("hides and shows the copy affordance button with property expansion state", async () => {
    render(
      <TestContextProvider>
        <InteractionSection interaction="Properties" />
      </TestContextProvider>
    );

    expect(
      screen.queryByRole("button", { name: /copy property/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("status"));

    expect(
      await screen.findByRole("button", { name: /copy property/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("status"));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /copy property/i })
      ).not.toBeInTheDocument();
    });
  });

  test("hides and shows the delete affordance button with property expansion state", async () => {
    render(
      <TestContextProvider>
        <InteractionSection interaction="Properties" />
      </TestContextProvider>
    );

    expect(
      screen.queryByRole("button", { name: /delete property/i })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("status"));

    expect(
      await screen.findByRole("button", { name: /delete property/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("status"));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /delete property/i })
      ).not.toBeInTheDocument();
    });
  });

  test("deletes a property and updates offlineTd", async () => {
    render(
      <TestContextProvider>
        <InteractionSection interaction="Properties" />
        <OfflineTdProbe />
      </TestContextProvider>
    );

    fireEvent.click(screen.getByText("status"));
    fireEvent.click(
      await screen.findByRole("button", { name: /delete property/i })
    );

    await waitFor(() => {
      const td = getOfflineTdJson();

      expect(td.properties).not.toHaveProperty("status");
      expect(td.actions).toHaveProperty("toggle");
      expect(td.events).toHaveProperty("overheating");
    });

    await waitFor(() => {
      expect(screen.queryByText("status")).not.toBeInTheDocument();
    });
  });
});
