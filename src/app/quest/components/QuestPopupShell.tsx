import { createPortal } from "react-dom";
import QuestSettingsPanel from "@/components/QuestSettingsPanel";

type Props = {
  questStatus: string;
  studentId: string | null;
  sessionMailStatus: string | null;
  sessionError: string | null;
  plusMinusPopupOpen: boolean;
  plusMinusPopupAnchor: { left: number; top: number } | null;
  plusMinusCandidate: "+" | "-" | null;
  settingsOpen: boolean;
  onCloseSettings: () => void;
  onResetProgress: () => void;
};

export function QuestPopupShell({
  questStatus,
  studentId,
  sessionMailStatus,
  sessionError,
  plusMinusPopupOpen,
  plusMinusPopupAnchor,
  plusMinusCandidate,
  settingsOpen,
  onCloseSettings,
  onResetProgress
}: Props) {
  return (
    <>
      {questStatus === "playing" && (
        <section className="w-full pb-1 space-y-1">
          {!studentId && (
            <div className="text-[10px] text-right text-slate-600 bg-white/90 border border-slate-200 rounded px-2 py-1">
              保護者設定が未保存のためレポート配信はできません。
            </div>
          )}
          {sessionMailStatus && (
            <div className="text-[10px] text-right text-emerald-700 font-semibold bg-emerald-50/95 border border-emerald-200 rounded px-2 py-1">
              {sessionMailStatus}
            </div>
          )}
          {sessionError && (
            <div className="text-[10px] text-right text-red-700 bg-red-50/95 border border-red-200 rounded px-2 py-1">
              {sessionError}
            </div>
          )}
        </section>
      )}
      {plusMinusPopupOpen && plusMinusPopupAnchor && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[120] inline-flex w-[52px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white/95 shadow-xl"
              style={{ left: plusMinusPopupAnchor.left, top: plusMinusPopupAnchor.top }}
              aria-hidden="true"
            >
              <div className={`flex h-8 items-center justify-center text-sm font-bold ${plusMinusCandidate === "+" ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-700"}`}>+</div>
              <div className={`flex h-8 items-center justify-center text-sm font-bold border-t border-slate-200 ${plusMinusCandidate === "-" ? "bg-rose-100 text-rose-700" : "bg-white text-slate-700"}`}>-</div>
            </div>,
            document.body
          )
        : null}
      <QuestSettingsPanel
        open={settingsOpen}
        onClose={onCloseSettings}
        onResetProgress={onResetProgress}
      />
    </>
  );
}
