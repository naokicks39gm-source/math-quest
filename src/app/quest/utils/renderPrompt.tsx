import { InlineMath } from "react-katex";

import { formatPrompt, trimTrailingEquationEquals, ensureTrailingEquationEquals } from "./formatPrompt";
import { renderMaybeMath, renderNumDecompPrompt, renderPromptWithSlotBox, renderCountDotGroups, toEquationTex } from "./renderMath";

type ExampleItemLike = {
  prompt: string;
  prompt_tex?: string;
  answer: string;
};

const shouldKeepEqualsForE13Plus = (typeId?: string, typeLabel?: string) => {
  if (!typeId?.startsWith("E1.")) return false;
  const m = (typeLabel ?? "").match(/Lv:E1-(\d+)/);
  if (!m) return false;
  return Number(m[1]) >= 3;
};

const shouldForceEqualsForElementaryE2Plus = (typeId?: string) =>
  Boolean(typeId && /^E[2-6]\./.test(typeId));

const hasArithmeticOperator = (text?: string) => Boolean(text && /[+\-×÷]/.test(text));

const parseCountValue = (item?: ExampleItemLike | null) => {
  if (!item) return 0;
  const countFromPrompt = Number((item.prompt ?? "").match(/(\d+)/)?.[1] ?? item.answer ?? "");
  return Number.isFinite(countFromPrompt) ? Math.max(0, Math.floor(countFromPrompt)) : 0;
};

export const renderPrompt = (item: ExampleItemLike | null | undefined, typeId?: string, typeLabel?: string) => {
  if (!item) return null;
  const keepEquals = shouldKeepEqualsForE13Plus(typeId, typeLabel);
  const forceEquals = shouldForceEqualsForElementaryE2Plus(typeId);
  const preserveArithmeticEquals = hasArithmeticOperator(item?.prompt ?? "") || hasArithmeticOperator(item?.prompt_tex ?? "");
  const shouldKeepPromptEquals = keepEquals || preserveArithmeticEquals;
  const shouldForcePromptEquals = forceEquals || preserveArithmeticEquals;
  if (typeId === "E2.NA.DIV.DIV_EQUAL_SHARE_BASIC") {
    const text = formatPrompt(item?.prompt ?? "", shouldKeepPromptEquals, shouldForcePromptEquals).replace(/1人/u, "\n1人");
    return <span className="inline-block whitespace-pre-line break-words leading-tight">{text}</span>;
  }
  if (typeId?.includes("E1_NUM_COUNT") || typeId?.includes("E1_NUMBER_COUNT") || typeId?.includes("E1-NUM-COUNT-")) {
    const count = parseCountValue(item);
    return (
      <span className="inline-flex flex-col items-start gap-0 whitespace-pre-line text-center leading-tight">
        <span >{renderCountDotGroups(count)}</span>
        <span className="mt-1">いくつ？</span>
      </span>
    );
  }
  if (typeId === "E1.NA.NUM.NUM_DECOMP_10") {
    const custom = renderNumDecompPrompt(item?.prompt ?? "");
    if (custom) return custom;
  }
  const tex = item?.prompt_tex?.trim();
  if (tex) {
    const displayTexRaw = shouldKeepPromptEquals ? tex : trimTrailingEquationEquals(tex);
    const displayTex = shouldForcePromptEquals ? ensureTrailingEquationEquals(displayTexRaw) : displayTexRaw;
    return (
      <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
        <InlineMath math={toEquationTex(displayTex)} renderError={() => <span>{formatPrompt(item?.prompt ?? "", shouldKeepPromptEquals, shouldForcePromptEquals)}</span>} />
      </span>
    );
  }
  const formattedPrompt = formatPrompt(item?.prompt ?? "", shouldKeepPromptEquals, shouldForcePromptEquals);
  const slotPrompt = renderPromptWithSlotBox(formattedPrompt);
  if (slotPrompt) return slotPrompt;
  if (formattedPrompt.includes("\n")) {
    return <span className="inline-block whitespace-pre-line break-words text-center leading-tight">{formattedPrompt}</span>;
  }
  return renderMaybeMath(formattedPrompt);
};
