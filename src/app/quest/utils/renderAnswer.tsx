import type { ReactNode } from "react";
import { InlineMath } from "react-katex";

import { toEquationTex } from "./renderMath";

export const renderKeyLabel = (token: string): ReactNode => {
  if (token === "/") return "分数";
  if (token === ".") return "小数点";
  if (token === "+") return "プラス";
  if (token === "+/-") return "+/-";
  if (token === "^") return "指数";
  if (token === "()") return "（）";
  if (token === "x") return <InlineMath math="x" renderError={() => <span>x</span>} />;
  if (token === "-") {
    return (
      <span className="inline-flex flex-col items-center leading-[0.9]">
        <span>マイ</span>
        <span>ナス</span>
      </span>
    );
  }
  return token;
};

export const renderAnswerWithSuperscript = (text?: string | null, isHighSchoolQuest = false) => {
  if (!text) return "\u2007";
  if (!isHighSchoolQuest) return text;
  const tex = toEquationTex(text).replace(/([A-Za-z0-9)])\^(-?\d+)/g, "$1^{$2}");
  return (
    <span className="inline-flex max-w-full items-center overflow-x-auto whitespace-nowrap align-middle">
      <InlineMath math={tex} renderError={() => <span>{text}</span>} />
    </span>
  );
};
