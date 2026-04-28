import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import AppFooter from "../components/App/AppFooter";
import ediTDorContext from "../context/ediTDorContext";
import {
  THING_DESCRIPTION_LAMP_JSON,
  THING_DESCRIPTION_LAMP_V_STRING,
  createContextValue,
} from "./constants";

const renderWithContext = (contextOverrides: Partial<IEdiTDorContext> = {}) =>
  render(
    <ediTDorContext.Provider value={createContextValue(contextOverrides)}>
      <AppFooter />
    </ediTDorContext.Provider>
  );

describe("Integration test on rendering elements", () => {
  test("renders counts, size, northbound state, version, and GitHub link from context", () => {
    renderWithContext({
      offlineTD: THING_DESCRIPTION_LAMP_V_STRING,
      parsedTD: THING_DESCRIPTION_LAMP_JSON,
      northboundConnection: {
        message: "Connected",
        northboundTd: THING_DESCRIPTION_LAMP_JSON,
      },
      isModified: true,
    });

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("Properties: 1")).toBeInTheDocument();
    expect(screen.getByText("| Actions: 1")).toBeInTheDocument();
    expect(screen.getByText("| Events: 1")).toBeInTheDocument();
    expect(
      screen.getByText(
        `| Size: ${THING_DESCRIPTION_LAMP_V_STRING.length} bytes`
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/northbound state:\s*connected/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();

    const githubLink = screen.getByRole("link");
    expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/eclipse-editdor/editdor"
    );
  });

  test("renders zero counts and unknown northbound state for an empty TD", () => {
    renderWithContext({
      offlineTD: "",
      parsedTD: {},
      northboundConnection: undefined,
      isModified: false,
    });

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("Properties: 0")).toBeInTheDocument();
    expect(screen.getByText("| Actions: 0")).toBeInTheDocument();
    expect(screen.getByText("| Events: 0")).toBeInTheDocument();
    expect(screen.getByText("| Size: 0 bytes")).toBeInTheDocument();
    expect(
      screen.getByText(/northbound state:\s*unknown/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/you have unsaved changes/i)
    ).not.toBeInTheDocument();
  });
});
