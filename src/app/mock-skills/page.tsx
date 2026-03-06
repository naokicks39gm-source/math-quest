"use client";

import { useRouter } from "next/navigation";
import { dummySkills, type DummySkill } from "@/mock/dummySkills";
import { SkillList } from "packages/ui";

export default function MockSkillsPage() {
  const router = useRouter();

  const handleSelect = (skill: DummySkill) => {
    router.push(`/mock-skills/${encodeURIComponent(skill.id)}`);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#dff4ea_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">Mock Flow</div>
          <h1 className="mt-3 text-4xl font-black text-slate-900">Skill List</h1>
          <p className="mt-3 text-sm text-slate-600">Skillを選ぶと、詳細画面へ移動します。</p>
          <div className="mt-8">
            <SkillList skills={dummySkills} onSelect={handleSelect} />
          </div>
        </section>
      </div>
    </main>
  );
}
