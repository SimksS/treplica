import type { ReactNode } from "react";

interface Props {
  text: string;
}

function withBreaks(text: string): ReactNode {
  const lines = text.split("\n");
  if (lines.length === 1) return text;
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}

export function FormattedText({ text }: Props) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ margin: i > 0 ? "0.5em 0 0" : "0" }}>
          {withBreaks(para)}
        </p>
      ))}
    </>
  );
}
