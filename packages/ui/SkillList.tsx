"use client";

import type { DummySkill } from "@/mock/dummySkills";
import SkillCard from "packages/ui/SkillCard";

type SkillListProps = {
  skills: DummySkill[];
  onSelect: (skill: DummySkill) => void;
};

export default function SkillList({ skills, onSelect }: SkillListProps) {
  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} onSelect={onSelect} />
      ))}
    </div>
  );
}
