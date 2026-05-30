import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageSelector } from "../../src/features/live-session/LanguageSelector";
import { TranslationPanel } from "../../src/features/live-session/TranslationPanel";
import { fixtureTranslations } from "../fixtures/session-fixtures";

describe("Translation UI", () => {
  it("shows disabled panel when translation is off", () => {
    render(<TranslationPanel translations={[]} enabled={false} />);
    expect(screen.getByTestId("translation-panel-disabled")).toBeInTheDocument();
    expect(
      screen.getByText(/Selecione um idioma de destino/),
    ).toBeInTheDocument();
  });

  it("shows empty state when enabled without translations", () => {
    render(<TranslationPanel translations={[]} enabled />);
    expect(screen.getByTestId("translation-panel")).toBeInTheDocument();
    expect(screen.getByTestId("translation-empty")).toBeInTheDocument();
  });

  it("renders translation items", () => {
    render(<TranslationPanel translations={fixtureTranslations} enabled />);
    expect(screen.getAllByTestId("translation-item")).toHaveLength(1);
    expect(screen.getByText(/\[EN\]/)).toBeInTheDocument();
  });

  it("marks uncertain translations", () => {
    render(
      <TranslationPanel
        translations={[{ ...fixtureTranslations[0], is_uncertain: true }]}
        enabled
      />,
    );
    expect(screen.getByTestId("translation-uncertain")).toBeInTheDocument();
  });

  it("language selector fires onChange", () => {
    let selected = "";
    render(
      <LanguageSelector
        value=""
        onChange={(code) => {
          selected = code;
        }}
      />,
    );
    fireEvent.change(screen.getByTestId("language-select"), {
      target: { value: "en" },
    });
    expect(selected).toBe("en");
  });
});
