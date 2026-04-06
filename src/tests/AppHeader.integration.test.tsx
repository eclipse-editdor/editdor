import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AppHeader from "../components/App/AppHeader";
import ediTDorContext from "../context/ediTDorContext";
import * as fileTdService from "../services/fileTdService";
import {
  THING_DESCRIPTION_LAMP_JSON,
  THING_DESCRIPTION_LAMP_V_STRING,
  createContextValue,
} from "./constants";

vi.mock("../services/fileTdService", () => ({
  readFromFile: vi.fn(),
  saveToFile: vi.fn(),
}));

vi.mock("../components/Dialogs/ErrorDialog", () => ({
  default: ({
    isOpen,
    errorMessage,
    onClose,
  }: {
    isOpen: boolean;
    errorMessage: string;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="alertdialog">
        <p>{errorMessage}</p>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../components/Dialogs/ConvertTmDialog", async () => {
  const React = await import("react");

  const MockConvertTmDialog = React.forwardRef((_props, ref) => {
    const [opened, setOpened] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      openModal: () => setOpened(true),
      close: () => setOpened(false),
    }));

    return opened ? <div>Convert TM Dialog</div> : null;
  });

  return { default: MockConvertTmDialog };
});

vi.mock("../components/Dialogs/CreateTdDialog", async () => {
  const React = await import("react");

  const MockCreateTdDialog = React.forwardRef((_props, ref) => {
    const [opened, setOpened] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      openModal: () => setOpened(true),
    }));

    return opened ? <div>Create TD Dialog</div> : null;
  });

  return { default: MockCreateTdDialog };
});

vi.mock("../components/Dialogs/SettingsDialog", async () => {
  const React = await import("react");

  const MockSettingsDialog = React.forwardRef((_props, ref) => {
    const [opened, setOpened] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      openModal: () => setOpened(true),
      close: () => setOpened(false),
    }));

    return opened ? <div>Settings Dialog</div> : null;
  });

  return { default: MockSettingsDialog };
});

vi.mock("../components/Dialogs/ShareDialog", async () => {
  const React = await import("react");

  const MockShareDialog = React.forwardRef((_props, ref) => {
    const [opened, setOpened] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      openModal: () => setOpened(true),
    }));

    return opened ? <div>Share Dialog</div> : null;
  });

  return { default: MockShareDialog };
});

vi.mock("../components/Dialogs/ContributeToCatalogDialog", async () => {
  const React = await import("react");

  const MockContributeDialog = React.forwardRef((_props, ref) => {
    const [opened, setOpened] = React.useState(false);

    React.useImperativeHandle(ref, () => ({
      openModal: () => setOpened(true),
      close: () => setOpened(false),
    }));

    return opened ? <div>Contribute To Catalog Dialog</div> : null;
  });

  return { default: MockContributeDialog };
});

vi.mock("../components/Dialogs/SendTDDialog", async () => {
  const React = await import("react");

  const MockSendTDDialog = React.forwardRef(
    ({ currentTdId }: { currentTdId: string }, ref) => {
      const [opened, setOpened] = React.useState(false);

      React.useImperativeHandle(ref, () => ({
        openModal: () => setOpened(true),
        close: () => setOpened(false),
      }));

      return opened ? <div>Send TD Dialog for {currentTdId}</div> : null;
    }
  );

  return { default: MockSendTDDialog };
});

const mockedReadFromFile = vi.mocked(fileTdService.readFromFile);
const mockedSaveToFile = vi.mocked(fileTdService.saveToFile);

const renderWithContext = (contextOverrides: Partial<IEdiTDorContext> = {}) => {
  const contextValue = createContextValue(contextOverrides);

  const view = render(
    <ediTDorContext.Provider value={contextValue}>
      <AppHeader />
    </ediTDorContext.Provider>
  );

  return {
    ...view,
    contextValue,
  };
};

describe("Integration test on rendering elements, actions and errors", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedReadFromFile.mockReset();
    mockedSaveToFile.mockReset();

    Object.defineProperty(window, "confirm", {
      configurable: true,
      writable: true,
      value: vi.fn(() => true),
    });

    Object.defineProperty(window, "open", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test("renders the header and primary actions", () => {
    renderWithContext();

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logo/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send td/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /contribute to catalog/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^share$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /settings/i })
    ).toBeInTheDocument();
  });

  test("opens the project site when the logo button is clicked", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: /logo/i }));

    expect(window.open).toHaveBeenCalledWith(
      "https://eclipse-editdor.github.io/editdor/",
      "_blank"
    );
  });

  test("shows the create dialog when Create is clicked", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(screen.getByText("Create TD Dialog")).toBeInTheDocument();
  });

  test("shows the share dialog when Share is clicked", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: /^share$/i }));

    expect(screen.getByText("Share Dialog")).toBeInTheDocument();
  });

  test("shows the settings dialog when Settings is clicked", () => {
    renderWithContext();

    fireEvent.click(screen.getByRole("button", { name: /settings/i }));

    expect(screen.getByText("Settings Dialog")).toBeInTheDocument();
  });

  test("shows an error when Send TD is clicked without a TD loaded", () => {
    renderWithContext({
      offlineTD: "",
      parsedTD: {},
    });

    fireEvent.click(screen.getByRole("button", { name: /send td/i }));

    expect(
      screen.getByText(/no thing description available to send/i)
    ).toBeInTheDocument();
  });

  test("shows an error when Send TD is clicked without a configured southbound URL", () => {
    renderWithContext({
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      parsedTD: THING_DESCRIPTION_LAMP_JSON,
    });

    fireEvent.click(screen.getByRole("button", { name: /send td/i }));

    expect(
      screen.getByText(/no southbound url available/i)
    ).toBeInTheDocument();
  });

  test("opens the Send TD dialog when TD, southbound URL, and id are available", () => {
    localStorage.setItem("southbound", "http://localhost:8080");

    renderWithContext({
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      parsedTD: THING_DESCRIPTION_LAMP_JSON,
    });

    fireEvent.click(screen.getByRole("button", { name: /send td/i }));

    expect(
      screen.getByText(`Send TD Dialog for ${THING_DESCRIPTION_LAMP_JSON.id}`)
    ).toBeInTheDocument();
  });

  test("shows an error when Contribute to Catalog is clicked without a loaded TM", () => {
    renderWithContext({
      offlineTD: "",
      parsedTD: {},
    });

    fireEvent.click(
      screen.getByRole("button", { name: /contribute to catalog/i })
    );

    expect(
      screen.getByText(/please first load a thing model to be validated/i)
    ).toBeInTheDocument();
  });

  test("shows an error when Contribute to Catalog is clicked for a non-TM document", () => {
    renderWithContext({
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      parsedTD: THING_DESCRIPTION_LAMP_JSON,
    });

    fireEvent.click(
      screen.getByRole("button", { name: /contribute to catalog/i })
    );

    expect(
      screen.getByText(/the tm must have the following pair key\/value/i)
    ).toBeInTheDocument();
  });

  test("opens the Contribute to Catalog dialog for a valid TM", () => {
    renderWithContext({
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      parsedTD: {
        ...THING_DESCRIPTION_LAMP_JSON,
        "@type": "tm:ThingModel",
      },
      validationMessage: {
        report: {
          json: null,
          schema: "passed",
          defaults: null,
          jsonld: null,
          additional: null,
        },
        details: {
          enumConst: null,
          propItems: null,
          security: null,
          propUniqueness: null,
          multiLangConsistency: null,
          linksRelTypeCount: null,
          readWriteOnly: null,
          uriVariableSecurity: null,
        },
        detailComments: {
          enumConst: null,
          propItems: null,
          security: null,
          propUniqueness: null,
          multiLangConsistency: null,
          linksRelTypeCount: null,
          readWriteOnly: null,
          uriVariableSecurity: null,
        },
        validationErrors: {
          json: "",
          schema: "",
        },
        customMessage: "",
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /contribute to catalog/i })
    );

    expect(
      screen.getByText("Contribute To Catalog Dialog")
    ).toBeInTheDocument();
  });

  test("renders the To TD button only for Thing Models", () => {
    const { rerender } = render(
      <ediTDorContext.Provider
        value={createContextValue({
          parsedTD: THING_DESCRIPTION_LAMP_JSON,
        })}
      >
        <AppHeader />
      </ediTDorContext.Provider>
    );

    expect(
      screen.queryByRole("button", { name: /to td/i })
    ).not.toBeInTheDocument();

    rerender(
      <ediTDorContext.Provider
        value={createContextValue({
          parsedTD: {
            ...THING_DESCRIPTION_LAMP_JSON,
            "@type": "tm:ThingModel",
          },
        })}
      >
        <AppHeader />
      </ediTDorContext.Provider>
    );

    expect(screen.getByRole("button", { name: /to td/i })).toBeInTheDocument();
  });

  test("opens the Convert TM dialog when To TD is clicked", () => {
    renderWithContext({
      parsedTD: {
        ...THING_DESCRIPTION_LAMP_JSON,
        "@type": "tm:ThingModel",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /to td/i }));

    expect(screen.getByText("Convert TM Dialog")).toBeInTheDocument();
  });

  test("opens a TD from file and updates context state", async () => {
    mockedReadFromFile.mockResolvedValue({
      td: THING_DESCRIPTION_LAMP_V_STRING,
      fileName: "lamp.jsonld",
      fileHandle: "mock-handle",
    });

    const { contextValue } = renderWithContext({
      isModified: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /open/i }));

    await waitFor(() => {
      expect(mockedReadFromFile).toHaveBeenCalled();
    });

    expect(contextValue.updateOfflineTD).toHaveBeenCalledWith(
      THING_DESCRIPTION_LAMP_V_STRING
    );
    expect(contextValue.updateIsModified).toHaveBeenCalledWith(false);
    expect(contextValue.setFileHandle).toHaveBeenCalledWith("mock-handle");
    expect(contextValue.updateLinkedTd).toHaveBeenCalledWith(undefined);
    expect(contextValue.addLinkedTd).toHaveBeenCalledWith({
      "./lamp.jsonld": "mock-handle",
    });
  });

  test("asks for confirmation before opening a new file when the TD is modified", async () => {
    mockedReadFromFile.mockResolvedValue({
      td: THING_DESCRIPTION_LAMP_V_STRING,
      fileName: "lamp.jsonld",
      fileHandle: "mock-handle",
    });

    renderWithContext({
      isModified: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /open/i }));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Discard changes? All changes you made to your TD will be lost."
      );
    });
  });

  test("saves the current TD when Download is clicked", async () => {
    mockedSaveToFile.mockResolvedValue("saved-handle");

    const { contextValue } = renderWithContext({
      name: "lamp",
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      fileHandle: null,
    });

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => {
      expect(mockedSaveToFile).toHaveBeenCalledWith(
        "lamp",
        undefined,
        THING_DESCRIPTION_LAMP_V_STRING
      );
    });

    expect(contextValue.setFileHandle).toHaveBeenCalledWith("saved-handle");
    expect(contextValue.updateIsModified).toHaveBeenCalledWith(false);
  });
});
