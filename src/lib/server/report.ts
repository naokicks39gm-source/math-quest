import "server-only";

import {
  getRecentCompletedSessions,
  getSessionAnswers
} from "@/lib/server/db";
import { getCatalogGrades } from "@/lib/gradeCatalog";

export type GuardianReport = {
  total: number;
  correct: number;
  accuracy: number;
  studyWindow: {
    startedAt: string;
    endedAt: string;
    durationMinutes: number;
  };
  categoryStats: Array<{
    categoryId: string;
    categoryName: string;
    typeId: string;
    typeName: string;
    fullPathName: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
  wrongHighlights: Array<{
    categoryId: string;
    categoryName: string;
    typeId: string;
    prompt: string;
    predicted: string;
    correctAnswer: string;
  }>;
  differences: string[];
  nextActions: string[];
};

type TypeMeta = {
  categoryId: string;
  categoryName: string;
  typeName: string;
};

const typeMetaMap = (() => {
  const map = new Map<string, TypeMeta>();
  const grades = getCatalogGrades();
  for (const grade of grades) {
    for (const category of grade.categories ?? []) {
      for (const type of category.types ?? []) {
        map.set(type.type_id, {
          categoryId: category.category_id,
          categoryName: category.category_name,
          typeName: type.display_name ?? type.type_name
        });
      }
    }
  }
  return map;
})();

const getTypeMeta = (typeId: string): TypeMeta => {
  const hit = typeMetaMap.get(typeId);
  if (hit) return hit;
  return {
    categoryId: "unknown",
    categoryName: "未分類",
    typeName: typeId
  };
};

const getDurationMinutes = (startedAt: string, endedAt: string) => {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.round(ms / 60000);
};

const formatSigned = (value: number, unit: string, digits = 1) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${unit}`;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const buildGuardianReport = (params: {
  sessionId: string;
  studentId: string;
  total: number;
  correct: number;
  accuracy: number;
  startedAt: string;
  endedAt: string;
}) => {
  const answers = getSessionAnswers(params.sessionId);
  const durationMinutes = getDurationMinutes(params.startedAt, params.endedAt);

  const byCategory = new Map<
    string,
    { categoryId: string; categoryName: string; total: number; correct: number; wrong: number }
  >();
  const byType = new Map<
    string,
    { categoryId: string; categoryName: string; typeId: string; typeName: string; total: number; correct: number }
  >();

  for (const answer of answers) {
    const meta = getTypeMeta(answer.typeId);
    const key = meta.categoryId;
    const row = byCategory.get(key) ?? {
      categoryId: meta.categoryId,
      categoryName: meta.categoryName,
      total: 0,
      correct: 0,
      wrong: 0
    };
    row.total += 1;
    if (answer.isCorrect) {
      row.correct += 1;
    } else {
      row.wrong += 1;
    }
    byCategory.set(key, row);

    const typeRow = byType.get(answer.typeId) ?? {
      categoryId: meta.categoryId,
      categoryName: meta.categoryName,
      typeId: answer.typeId,
      typeName: meta.typeName,
      total: 0,
      correct: 0
    };
    typeRow.total += 1;
    if (answer.isCorrect) {
      typeRow.correct += 1;
    }
    byType.set(answer.typeId, typeRow);
  }

  const categoryStats = Array.from(byType.values())
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      typeId: row.typeId,
      typeName: row.typeName,
      fullPathName: `${row.categoryName}　${row.typeName}`,
      total: row.total,
      correct: row.correct,
      accuracy: row.total > 0 ? row.correct / row.total : 0
    }))
    .sort((a, b) => b.total - a.total || a.fullPathName.localeCompare(b.fullPathName));

  const wrongHighlights: GuardianReport["wrongHighlights"] = [];
  const seenWrongCategory = new Set<string>();
  for (const answer of answers) {
    if (answer.isCorrect) continue;
    const meta = getTypeMeta(answer.typeId);
    if (seenWrongCategory.has(meta.categoryId)) continue;
    seenWrongCategory.add(meta.categoryId);
    wrongHighlights.push({
      categoryId: meta.categoryId,
      categoryName: meta.categoryName,
      typeId: answer.typeId,
      prompt: answer.prompt,
      predicted: answer.predicted,
      correctAnswer: answer.correctAnswer
    });
  }

  const previousSessions = getRecentCompletedSessions(params.studentId, params.sessionId, 3);
  const differences: string[] = [];
  const nextActions: string[] = [];

  const currentWrongRate = new Map<string, number>();
  for (const stat of byCategory.values()) {
    currentWrongRate.set(stat.categoryId, stat.total > 0 ? stat.wrong / stat.total : 0);
  }

  if (previousSessions.length === 0) {
    differences.push("初回のため比較データはありません。");
  } else {
    const previousAnswers = previousSessions.flatMap((session) => getSessionAnswers(session.id));
    const averageAccuracy =
      previousSessions.reduce((sum, session) => sum + session.accuracy, 0) / previousSessions.length;
    const averageTotal =
      previousSessions.reduce((sum, session) => sum + session.total, 0) / previousSessions.length;
    const averageDuration =
      previousSessions.reduce((sum, session) => {
        if (!session.endedAt) return sum;
        return sum + getDurationMinutes(session.startedAt, session.endedAt);
      }, 0) / previousSessions.length;

    differences.push(`正答率: ${formatSigned((params.accuracy - averageAccuracy) * 100, "pt")}`);
    differences.push(`問題数: ${formatSigned(params.total - averageTotal, "問")}`);
    differences.push(`学習時間: ${formatSigned(durationMinutes - averageDuration, "分")}`);

    const prevCategoryAgg = new Map<string, { total: number; wrong: number }>();
    for (const answer of previousAnswers) {
      const meta = getTypeMeta(answer.typeId);
      const row = prevCategoryAgg.get(meta.categoryId) ?? { total: 0, wrong: 0 };
      row.total += 1;
      if (!answer.isCorrect) row.wrong += 1;
      prevCategoryAgg.set(meta.categoryId, row);
    }

    const worsened = Array.from(currentWrongRate.entries())
      .map(([categoryId, rate]) => {
        const prev = prevCategoryAgg.get(categoryId);
        const prevRate = prev && prev.total > 0 ? prev.wrong / prev.total : 0;
        return {
          categoryId,
          categoryName: byCategory.get(categoryId)?.categoryName ?? categoryId,
          delta: rate - prevRate
        };
      })
      .filter((x) => x.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 1);

    if (worsened.length > 0) {
      differences.push(
        `誤答率が増えたカテゴリ: ${worsened[0].categoryName} (${formatSigned(worsened[0].delta * 100, "pt")})`
      );
    }
  }

  const byWrongRate = Array.from(byCategory.values())
    .map((c) => ({ ...c, wrongRate: c.total > 0 ? (c.total - c.correct) / c.total : 0 }))
    .sort((a, b) => b.wrongRate - a.wrongRate || b.total - a.total);

  if (wrongHighlights.length === 0) {
    const best = [...byCategory.values()]
      .map((c) => ({ ...c, accuracy: c.total > 0 ? c.correct / c.total : 0 }))
      .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0];
    if (best) {
      nextActions.push(
        `${best.categoryName}: 正答率が高いので難易度を1段上げた問題に進みましょう。`
      );
    } else {
      nextActions.push("次回はまず1カテゴリを選んで、例題を3問解いてペースを作りましょう。");
    }
  } else {
    const worst = byWrongRate[0];
    if (worst && worst.wrongRate > 0) {
      nextActions.push(`${worst.categoryName}: 誤答が多いため、同カテゴリの例題を1〜3問復習しましょう。`);
    }
    const worsenedText = differences.find((line) => line.startsWith("誤答率が増えたカテゴリ: "));
    if (worsenedText) {
      const target = worsenedText.replace("誤答率が増えたカテゴリ: ", "").split(" (")[0];
      nextActions.push(`${target}: 短時間（5〜10分）で再挑戦し、正答率回復を狙いましょう。`);
    }
    for (const row of byWrongRate) {
      if (nextActions.length >= 3) break;
      if (row.wrongRate <= 0) continue;
      const exists = nextActions.some((line) => line.startsWith(`${row.categoryName}:`));
      if (!exists) {
        nextActions.push(`${row.categoryName}: 例題を1〜3問から再開し、途中式を確認しましょう。`);
      }
    }
  }

  return {
    total: params.total,
    correct: params.correct,
    accuracy: params.accuracy,
    studyWindow: {
      startedAt: params.startedAt,
      endedAt: params.endedAt,
      durationMinutes
    },
    categoryStats,
    wrongHighlights,
    differences,
    nextActions: nextActions.slice(0, 3)
  } satisfies GuardianReport;
};

export const renderGuardianReportMail = (studentName: string, report: GuardianReport) => {
  const accuracyPct = `${(report.accuracy * 100).toFixed(1)}%`;
  const categoryLines =
    report.categoryStats.length === 0
      ? "・実績データなし"
      : report.categoryStats
          .map((c) => `・${c.fullPathName}: ${c.total}問 / 正答率 ${(c.accuracy * 100).toFixed(1)}%`)
          .join("\n");
  const wrongLines =
    report.wrongHighlights.length === 0
      ? "・誤答はありません"
      : report.wrongHighlights
          .map((w) => `・[${w.categoryName}] 問題: ${w.prompt} / 入力: ${w.predicted || "(空欄)"} / 正解: ${w.correctAnswer}`)
          .join("\n");
  const differenceLines = report.differences.map((line) => `・${line}`).join("\n");
  const nextLines = report.nextActions.map((line) => `・${line}`).join("\n");
  const text = [
    `【Math Quest】${studentName}さんの学習レポート`,
    "",
    "1. 学習時間",
    `・開始: ${formatDateTime(report.studyWindow.startedAt)}`,
    `・終了: ${formatDateTime(report.studyWindow.endedAt)}`,
    `・合計: ${report.studyWindow.durationMinutes}分`,
    "",
    "2. 解いたカテゴリ",
    categoryLines,
    "",
    "3. カテゴリごとの代表誤答",
    wrongLines,
    "",
    "4. 直近3回平均との差分",
    differenceLines,
    "",
    "5. 次にやるとよい内容",
    nextLines,
    "",
    `今回の成績: ${report.correct}/${report.total}問 正解（正答率 ${accuracyPct}）`
  ].join("\n");

  const htmlList = (lines: string[]) => lines.map((line) => `<li>${line}</li>`).join("");
  const html = `
    <h2>【Math Quest】${studentName}さんの学習レポート</h2>
    <h3>1. 学習時間</h3>
    <ul>
      <li>開始: ${formatDateTime(report.studyWindow.startedAt)}</li>
      <li>終了: ${formatDateTime(report.studyWindow.endedAt)}</li>
      <li>合計: ${report.studyWindow.durationMinutes}分</li>
    </ul>
    <h3>2. 解いたカテゴリ</h3>
    <ul>
      ${
        report.categoryStats.length === 0
          ? "<li>実績データなし</li>"
          : htmlList(
              report.categoryStats.map(
                (c) => `${c.fullPathName}: ${c.total}問 / 正答率 ${(c.accuracy * 100).toFixed(1)}%`
              )
            )
      }
    </ul>
    <h3>3. カテゴリごとの代表誤答</h3>
    <ul>
      ${
        report.wrongHighlights.length === 0
          ? "<li>誤答はありません</li>"
          : htmlList(
              report.wrongHighlights.map(
                (w) => `[${w.categoryName}] 問題: ${w.prompt} / 入力: ${w.predicted || "(空欄)"} / 正解: ${w.correctAnswer}`
              )
            )
      }
    </ul>
    <h3>4. 直近3回平均との差分</h3>
    <ul>${htmlList(report.differences)}</ul>
    <h3>5. 次にやるとよい内容</h3>
    <ul>${htmlList(report.nextActions)}</ul>
    <p>今回の成績: ${report.correct}/${report.total}問 正解（正答率 ${accuracyPct}）</p>
  `;

  return { subject: `【Math Quest】${studentName}さんの学習レポート`, text, html };
};
