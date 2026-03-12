"use client";

type SkillProgressBarProps = {
  mastery: number;
  tone?: "danger" | "warning" | "success";
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const toneClassMap: Record<NonNullable<SkillProgressBarProps["tone"]>, string> = {
  danger: "bg-red-400",
  warning: "bg-yellow-400",
  success: "bg-green-500"
};

export default function SkillProgressBar({ mastery, tone = "success" }: SkillProgressBarProps) {
  const normalizedMastery = clamp(mastery);

  return (
    <div className="mt-3">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${toneClassMap[tone]}`}
          style={{ width: `${normalizedMastery * 100}%` }}
        />
      </div>
    </div>
  );
}
