interface Props {
  value: string;
  disabled?: boolean;
  onChange: (language: string) => void;
}

const LANGUAGES = [
  { code: "", label: "Sem tradução" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
];

export function LanguageSelector({ value, disabled, onChange }: Props) {
  return (
    <label className="language-selector" data-testid="language-selector">
      <span className="language-label">Traduzir para</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        data-testid="language-select"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code || "none"} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      <style>{`
        .language-selector { display: flex; align-items: center; gap: var(--space-sm); font-size: 0.875rem; }
        .language-label { color: var(--color-text-muted); }
        select {
          background: var(--color-surface-elevated);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--space-xs) var(--space-sm);
        }
      `}</style>
    </label>
  );
}
