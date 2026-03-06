"use client";

import SkillCard, { type SkillCardItem } from "packages/ui/SkillCard";

type SkillListProps = {
  skills: SkillCardItem[];
  onSelect: (skill: SkillCardItem) => void;
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
