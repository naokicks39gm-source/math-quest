import type { FractionEditorState } from "@/utils/answerValidation";

export const renderFractionEditorValue = (editor: FractionEditorState | null | undefined) => {
  if (!editor) return null;
  const renderPart = (text: string, active: boolean) => (
    <span className="inline-flex items-center justify-center min-h-[1.1em] min-w-[1.2em]">
      <span>{text || "\u2007"}</span>
      {active && (
        <span className="inline-block ml-0.5 h-[0.9em] w-[2px] bg-current animate-pulse align-middle" />
      )}
    </span>
  );
  return (
    <span className="inline-flex flex-col items-center leading-none">
      <span>{renderPart(editor.num, editor.part === "num")}</span>
      <span className="my-0.5 block h-[2px] w-[1.8em] rounded bg-current/80" />
      <span>{renderPart(editor.den, editor.part === "den")}</span>
    </span>
  );
};
