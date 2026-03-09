"use client";

type SkillProgressBarProps = {
  mastery: number;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export default function SkillProgressBar({ mastery }: SkillProgressBarProps) {
  const normalizedMastery = clamp(mastery);

  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all"
          style={{ width: `${normalizedMastery * 100}%` }}
        />
      </div>
    </div>
  );
}
