import React, { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import SettingsDialog, {
  SettingsDialogRef,
} from "../components/Dialogs/SettingsDialog";

interface SettingsHarnessProps {
  initialJsonIndentation?: 2 | 4;
}

const SettingsHarness: React.FC<SettingsHarnessProps> = ({
  initialJsonIndentation = 2,
}) => {
  const settingsDialogRef = useRef<SettingsDialogRef>(null);
  const [jsonIndentation, setJsonIndentation] = useState<2 | 4>(
    initialJsonIndentation
  );

  return (
    <>
      <button onClick={() => settingsDialogRef.current?.openModal()}>
        Open Settings
      </button>
      <SettingsDialog
        ref={settingsDialogRef}
        jsonIndentation={jsonIndentation}
        onJsonIndentationChange={setJsonIndentation}
      />
      <output data-testid="editor-json-indentation">{jsonIndentation}</output>
    </>
  );
};

const renderSettingsDialog = (initialJsonIndentation: 2 | 4 = 2) =>
  render(<SettingsHarness initialJsonIndentation={initialJsonIndentation} />);

describe("Settings integration", () => {
  beforeEach(() => {
    localStorage.clear();

    const modalRoot = document.createElement("div");
    modalRoot.id = "modal-root";
    document.body.appendChild(modalRoot);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.getElementById("modal-root")?.remove();
  });

  test("opens the dialog and shows stored settings values to the user", () => {
    localStorage.setItem("northbound", "http://localhost:8080/");
    localStorage.setItem("southbound", "http://localhost:9090/");
    localStorage.setItem("valuePath", "/foo/bar");

    renderSettingsDialog(4);

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Change the ediTDors configuration to your needs")
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("http://localhost:8080/")
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("http://localhost:9090/")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("/foo/bar")).toBeInTheDocument();
    expect(screen.getByLabelText(/space indentation/i)).toHaveValue("4");
  });

  test("only updates the editor-facing indentation after the user saves", () => {
    renderSettingsDialog();

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));

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
    renderSettingsDialog();

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));

    fireEvent.change(screen.getByLabelText(/space indentation/i), {
      target: { value: "4" },
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByTestId("editor-json-indentation")).toHaveTextContent(
      "2"
    );

    fireEvent.click(screen.getByRole("button", { name: /open settings/i }));

    expect(screen.getByLabelText(/space indentation/i)).toHaveValue("2");
  });
});