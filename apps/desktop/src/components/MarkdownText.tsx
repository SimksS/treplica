import type { ReactNode } from "react";

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((seg, i) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return <strong key={i}>{seg.slice(2, -2)}</strong>;
        }
        if (seg.startsWith("*") && seg.endsWith("*")) {
          return <em key={i}>{seg.slice(1, -1)}</em>;
        }
        return seg || null;
      })}
    </>
  );
}

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) { i++; continue; }

    const hm = t.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      const level = hm[1].length;
      blocks.push({
        kind: (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1" | "h2" | "h3",
        text: hm[2],
      });
      i++;
      continue;
    }

    if (/^[-*+]\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+\.\s/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l || /^#{1,3}\s/.test(l) || /^[-*+]\s/.test(l) || /^\d+\.\s/.test(l)) break;
      paraLines.push(l);
      i++;
    }
    if (paraLines.length) blocks.push({ kind: "p", lines: paraLines });
  }

  return blocks;
}

interface Props {
  content: string;
  className?: string;
}

export function MarkdownText({ content, className }: Props) {
  const blocks = parseBlocks(content);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        switch (block.kind) {
          case "h1":
            return <h1 key={bi} className="md-h1">{parseInline(block.text)}</h1>;
          case "h2":
            return <h2 key={bi} className="md-h2">{parseInline(block.text)}</h2>;
          case "h3":
            return <h3 key={bi} className="md-h3">{parseInline(block.text)}</h3>;
          case "ul":
            return (
              <ul key={bi} className="md-ul">
                {block.items.map((item, ii) => <li key={ii}>{parseInline(item)}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={bi} className="md-ol">
                {block.items.map((item, ii) => <li key={ii}>{parseInline(item)}</li>)}
              </ol>
            );
          case "p":
            return (
              <p key={bi} className="md-p">
                {block.lines.map((line, li) => (
                  <span key={li}>
                    {parseInline(line)}
                    {li < block.lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
