"use client";

type QuestSettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  onResetProgress: () => void;
};

export default function QuestSettingsPanel({
  open,
  onClose,
  onResetProgress
}: QuestSettingsPanelProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed right-4 top-16 z-50 w-[280px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black text-slate-900">Settings</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-600"
        >
          Close
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
        <div className="text-sm font-bold text-rose-800">Reset Progress</div>
        <p className="mt-1 text-xs text-rose-700">XP / Streak / session / learning state をクリアします。</p>
        <button
          type="button"
          onClick={onResetProgress}
          className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white"
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
