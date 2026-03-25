import type { ReactNode } from "react";
import { InlineMath } from "react-katex";

import { formatPrompt, trimTrailingEquationEquals, ensureTrailingEquationEquals } from "./formatPrompt";

const INTEGER_FRACTION_PATTERN = /([+-]?\d+)\/([+-]?\d+)/g;
const EXPONENT_FRACTION_PATTERN = /([A-Za-z0-9(){}+\-^]+)\s*\/\s*([A-Za-z0-9(){}+\-^]+)/g;
const EQUATION_OPERATOR_PATTERN = /[=+\-*/×÷]/;
const SLOT_MARKER_PATTERN = /[?？□]/g;
const SLOT_LEFT_HINT_PATTERN = /[+\-×÷=＝とは]/;
const SLOT_RIGHT_HINT_PATTERN = /[0-9０-９A-Za-zぁ-んァ-ヶ一-龯(（]/;

type FractionMatch = { start: number; end: number; raw: string; num: string; den: string };

const isAsciiLetter = (ch: string) => /[A-Za-z]/.test(ch);

export const findDisplayFractionMatches = (text: string) => {
  const candidates: FractionMatch[] = [];
  INTEGER_FRACTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INTEGER_FRACTION_PATTERN.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    const prev = start > 0 ? text[start - 1] : "";
    const next = end < text.length ? text[end] : "";
    if (isAsciiLetter(prev) || isAsciiLetter(next)) continue;
    candidates.push({ start, end, raw: match[0], num: match[1], den: match[2] });
  }
  EXPONENT_FRACTION_PATTERN.lastIndex = 0;
  while ((match = EXPONENT_FRACTION_PATTERN.exec(text))) {
    const raw = match[0];
    if (!raw.includes("^")) continue;
    const start = match.index;
    const end = start + raw.length;
    const prev = start > 0 ? text[start - 1] : "";
    const next = end < text.length ? text[end] : "";
    if (isAsciiLetter(prev) || isAsciiLetter(next)) continue;
    candidates.push({
      start,
      end,
      raw,
      num: match[1].trim(),
      den: match[2].trim()
    });
  }
  candidates.sort((a, b) => a.start - b.start || b.end - a.end);
  const deduped: FractionMatch[] = [];
  for (const candidate of candidates) {
    const overlapped = deduped.some((m) => candidate.start < m.end && m.start < candidate.end);
    if (!overlapped) deduped.push(candidate);
  }
  return deduped;
};

export const toFractionTexInText = (text: string) => {
  const matches = findDisplayFractionMatches(text);
  if (matches.length === 0) return text;
  let cursor = 0;
  let out = "";
  for (const match of matches) {
    out += text.slice(cursor, match.start);
    out += `\\frac{${match.num}}{${match.den}}`;
    cursor = match.end;
  }
  out += text.slice(cursor);
  return out;
};

export const toEquationTex = (text: string) =>
  toFractionTexInText(text)
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ");

export const renderMaybeMath = (text?: string): ReactNode => {
  const safeText = text ?? "";
  if (!safeText) return null;
  const isEquationText = EQUATION_OPERATOR_PATTERN.test(safeText);
  if (isEquationText) {
    const tex = toEquationTex(safeText);
    return (
      <div className="flex flex-col items-start gap-0 leading-tight">
        <InlineMath math={tex} renderError={() => <span>{safeText}</span>} />
      </div>
    );
  }

  const matches = findDisplayFractionMatches(safeText);
  if (matches.length === 0) return <span className="whitespace-nowrap">{safeText}</span>;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (cursor < match.start) {
      nodes.push(<span key={`text-${cursor}`}>{safeText.slice(cursor, match.start)}</span>);
    }
    nodes.push(
      <InlineMath
        key={`frac-${match.start}-${match.end}`}
        math={toFractionTexInText(match.raw)}
        renderError={() => <span>{match.raw}</span>}
      />
    );
    cursor = match.end;
  }
  if (cursor < safeText.length) {
    nodes.push(<span key={`text-${cursor}`}>{safeText.slice(cursor)}</span>);
  }
  return (
    <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
      {nodes}
    </span>
  );
};

export const renderNumDecompPrompt = (prompt?: string): ReactNode | null => {
  if (!prompt) return null;
  const normalized = formatPrompt(prompt, false).replace(/\s+/g, "");
  const match = normalized.match(/^(\d+)は(\d+)と(?:□|[?？])でできます。?$/u);
  if (!match) return null;
  const total = match[1];
  const part = match[2];
  const tokenGapClass = "mx-[0.20em]";
  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      <span className="inline-flex min-w-[2ch] justify-center mr-[0.20em]">{total}</span>
      <span className="mr-[0.20em]">は</span>
      <span className={`inline-flex min-w-[2ch] justify-center ${tokenGapClass}`}>{part}</span>
      <span className="mx-[0.16em]">と</span>
      <span
        aria-hidden
        className={`inline-flex h-[1.12em] w-[1.12em] items-center justify-center rounded-[0.18em] border-2 border-emerald-100 align-[-0.04em] ${tokenGapClass}`}
      />
      <span className="ml-[0.16em]">でできます。</span>
    </span>
  );
};

const shouldRenderSlotMarker = (text: string, index: number) => {
  if (text[index] === "□") return true;
  const prev = index > 0 ? text[index - 1] : "";
  const next = index + 1 < text.length ? text[index + 1] : "";
  if (next && SLOT_RIGHT_HINT_PATTERN.test(next)) return true;
  if (!next && SLOT_LEFT_HINT_PATTERN.test(prev)) return true;
  return false;
};

export const renderPromptWithSlotBox = (text?: string): ReactNode | null => {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let last = 0;
  let changed = false;
  SLOT_MARKER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SLOT_MARKER_PATTERN.exec(text))) {
    const idx = match.index;
    if (!shouldRenderSlotMarker(text, idx)) continue;
    changed = true;
    if (idx > last) nodes.push(<span key={`slot-text-${last}`}>{text.slice(last, idx)}</span>);
    nodes.push(
      <span
        key={`slot-box-${idx}`}
        aria-hidden
        className="mx-[0.08em] inline-flex h-[0.98em] w-[0.98em] items-center justify-center rounded-[0.16em] border-2 border-emerald-100 align-[-0.04em]"
      />
    );
    last = idx + match[0].length;
  }
  if (!changed) return null;
  if (last < text.length) nodes.push(<span key={`slot-tail-${last}`}>{text.slice(last)}</span>);
  return <span className="inline-flex items-baseline whitespace-nowrap">{nodes}</span>;
};

export const renderCountDotGroups = (count: number) => {
  const groups = Math.floor(count / 5);
  const rest = count % 5;

  return (
    <span className="flex flex-col gap-2">
      {Array.from({ length: groups }).map((_, groupIndex) => (
        <span key={`count-group-${groupIndex}`} className="flex gap-2">
          {Array.from({ length: 5 }).map((__, dotIndex) => (
            <span key={`count-group-${groupIndex}-${dotIndex}`} className="h-4 w-4 rounded-full bg-white" />
          ))}
        </span>
      ))}
      {rest > 0 ? (
        <span className="flex gap-2">
          {Array.from({ length: rest }).map((_, dotIndex) => (
            <span key={`count-rest-${dotIndex}`} className="h-4 w-4 rounded-full bg-white" />
          ))}
        </span>
      ) : null}
    </span>
  );
};

export { trimTrailingEquationEquals, ensureTrailingEquationEquals };
