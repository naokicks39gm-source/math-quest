import Link from "next/link";
import { notFound } from "next/navigation";
import { getPracticeSkill } from "@/lib/learningSkillCatalog";

type SkillDetailPageProps = {
  params: Promise<{
    skillId: string;
  }>;
};

export default async function SkillDetailPage({ params }: SkillDetailPageProps) {
  const { skillId } = await params;
  const skill = getPracticeSkill(skillId);

  if (!skill) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef8ff_45%,#ecfdf5_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-600">Skill Detail</div>
          <h1 className="mt-3 text-4xl font-black text-slate-900">{skill.title}</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Code</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{skill.code}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Difficulty</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{skill.difficultyLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">問題数</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{skill.problemCount}</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/mock-practice?skillId=${encodeURIComponent(skill.id)}`}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
            >
              Practice Start
            </Link>
            <Link
              href="/mock-skills"
              className="rounded-2xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5"
            >
              Back to Skills
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
