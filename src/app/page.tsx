"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GradeDef } from "@/lib/elementaryContent";
import { getCatalogGrades } from "@/lib/gradeCatalog";

const LS_LAST_TYPE_ID = "mq:last_type_id";
const LS_STUDENT_ID = "mq:studentId";
const LS_STUDENT_NAME = "mq:studentName";
const LS_GUARDIAN_MASK = "mq:guardianMask";
const LS_ACTIVE_SESSION_ID = "mq:activeSessionId";

export default function Home() {
  const router = useRouter();
  const grades = useMemo(() => getCatalogGrades() as GradeDef[], []);

  const [gradeId, setGradeId] = useState(grades[0]?.grade_id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");

  const [studentName, setStudentName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [guardianMask, setGuardianMask] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMailStatus, setSessionMailStatus] = useState<string | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const categories = useMemo(() => {
    return grades.find((g) => g.grade_id === gradeId)?.categories ?? [];
  }, [grades, gradeId]);

  const types = useMemo(() => {
    return categories.find((c) => c.category_id === categoryId)?.types ?? [];
  }, [categories, categoryId]);

  useEffect(() => {
    const savedTypeId = typeof window !== "undefined" ? localStorage.getItem(LS_LAST_TYPE_ID) : null;
    if (savedTypeId) {
      const foundGrade = grades.find((g) =>
        g.categories.some((c) => c.types.some((t) => t.type_id === savedTypeId))
      );
      if (foundGrade) {
        setGradeId(foundGrade.grade_id);
        const foundCat = foundGrade.categories.find((c) =>
          c.types.some((t) => t.type_id === savedTypeId)
        );
        if (foundCat) {
          setCategoryId(foundCat.category_id);
          setTypeId(savedTypeId);
        }
      }
    }

    const savedStudentId = localStorage.getItem(LS_STUDENT_ID);
    const savedStudentName = localStorage.getItem(LS_STUDENT_NAME);
    const savedGuardianMask = localStorage.getItem(LS_GUARDIAN_MASK);
    const savedActiveSessionId = localStorage.getItem(LS_ACTIVE_SESSION_ID);

    if (savedStudentId) setStudentId(savedStudentId);
    if (savedStudentName) setStudentName(savedStudentName);
    if (savedGuardianMask) setGuardianMask(savedGuardianMask);
    if (savedActiveSessionId) setActiveSessionId(savedActiveSessionId);
  }, [grades]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].category_id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (types.length > 0 && !typeId) {
      setTypeId(types[0].type_id);
    }
  }, [types, typeId]);

  const postJson = async (url: string, payload: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(String(json?.error ?? "request_failed"));
    }
    return json;
  };

  const saveGuardianContact = async () => {
    try {
      setSessionActionLoading(true);
      setSessionError(null);
      const res = await fetch("/api/guardian-contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: studentName, parentEmail: guardianEmail })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(String(json?.error ?? "guardian_save_failed"));
      }
      setStudentId(json.studentId);
      setGuardianMask(json.parentEmailMasked);
      localStorage.setItem(LS_STUDENT_ID, String(json.studentId));
      localStorage.setItem(LS_STUDENT_NAME, studentName);
      localStorage.setItem(LS_GUARDIAN_MASK, String(json.parentEmailMasked));
      setSessionMailStatus(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "guardian_save_failed");
    } finally {
      setSessionActionLoading(false);
    }
  };

  const startSession = async () => {
    try {
      if (!studentId) {
        throw new Error("先に保護者メールを保存してください");
      }
      setSessionActionLoading(true);
      setSessionError(null);
      const json = await postJson("/api/session/start", { studentId });
      const id = String(json.sessionId);
      setActiveSessionId(id);
      localStorage.setItem(LS_ACTIVE_SESSION_ID, id);
      setSessionMailStatus(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "session_start_failed");
    } finally {
      setSessionActionLoading(false);
    }
  };

  const endSession = async () => {
    try {
      if (!activeSessionId) {
        throw new Error("セッションが開始されていません");
      }
      setSessionActionLoading(true);
      setSessionError(null);
      const json = await postJson("/api/session/end", { sessionId: activeSessionId });
      setSessionMailStatus(`メール: ${json.mail.status} (${json.mail.toMasked})`);
      setActiveSessionId(null);
      localStorage.removeItem(LS_ACTIVE_SESSION_ID);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "session_end_failed");
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleStart = () => {
    if (!typeId) {
      return;
    }
    localStorage.setItem(LS_LAST_TYPE_ID, typeId);
    const url = `/quest?type=${encodeURIComponent(typeId)}&category=${encodeURIComponent(categoryId)}`;
    router.push(url);
  };

  const handleStartAll = () => {
    router.push("/quest");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-5">
        <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 text-center">Math Quest</h1>
          <p className="mt-2 text-sm text-slate-600 text-center">
            下の保護者レポート枠で学習設定と開始/終了を行ってください。
          </p>
        </section>

        <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="font-semibold text-slate-800">学習の選択と開始</div>
          <label className="block text-sm font-bold text-slate-700">
            学年
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={gradeId}
              onChange={(e) => {
                setGradeId(e.target.value);
                setCategoryId("");
                setTypeId("");
              }}
            >
              {grades.map((g) => (
                <option key={g.grade_id} value={g.grade_id}>
                  {g.grade_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            カテゴリ
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setTypeId("");
              }}
            >
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            タイプ
            <select
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>
                  {t.display_name ?? t.type_name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={!typeId}
              className="px-4 py-2 rounded-lg font-bold text-white bg-indigo-600 disabled:bg-slate-300"
            >
              選択した学習ではじめる
            </button>
            <button
              type="button"
              onClick={handleStartAll}
              className="px-4 py-2 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-indigo-200"
            >
              全学年まとめてはじめる
            </button>
          </div>
          {!activeSessionId && (
            <div className="text-xs text-slate-500">
              保護者レポート送信を使う場合は、下の枠で「保存」後に「学習セッション開始」を押してください。
            </div>
          )}
        </section>

        <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="font-bold text-slate-800">保護者レポート設定</div>

          <div className="grid grid-cols-1 gap-2">
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="児童名"
              className="border border-slate-300 rounded px-2 py-1"
            />
            <input
              value={guardianEmail}
              onChange={(e) => setGuardianEmail(e.target.value)}
              placeholder="保護者メール"
              className="border border-slate-300 rounded px-2 py-1"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveGuardianContact}
              disabled={sessionActionLoading}
              className="px-3 py-1 rounded bg-slate-900 text-white font-bold disabled:bg-slate-300"
            >
              保存
            </button>
            <button
              type="button"
              onClick={startSession}
              disabled={sessionActionLoading || !studentId || !!activeSessionId}
              className="px-3 py-1 rounded bg-indigo-600 text-white font-bold disabled:bg-slate-300"
            >
              学習セッション開始
            </button>
            <button
              type="button"
              onClick={endSession}
              disabled={sessionActionLoading || !activeSessionId}
              className="px-3 py-1 rounded bg-emerald-600 text-white font-bold disabled:bg-slate-300"
            >
              学習終了
            </button>
          </div>

          {guardianMask && <div className="text-slate-600">宛先: {guardianMask}</div>}
          {activeSessionId && <div className="text-indigo-700 font-semibold">セッション記録中</div>}
          {sessionMailStatus && <div className="text-emerald-700 font-semibold">{sessionMailStatus}</div>}
          {sessionError && <div className="text-red-600">{sessionError}</div>}
        </section>
      </div>
    </main>
  );
}
