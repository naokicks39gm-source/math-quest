"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LS_STUDENT_ID = "mq:studentId";
const LS_STUDENT_NAME = "mq:studentName";
const LS_GUARDIAN_MASK = "mq:guardianMask";

export default function GuardianPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [guardianMask, setGuardianMask] = useState<string | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const savedStudentId = localStorage.getItem(LS_STUDENT_ID);
    const savedStudentName = localStorage.getItem(LS_STUDENT_NAME);
    const savedGuardianMask = localStorage.getItem(LS_GUARDIAN_MASK);

    if (savedStudentId) setStudentId(savedStudentId);
    if (savedStudentName) setStudentName(savedStudentName);
    if (savedGuardianMask) setGuardianMask(savedGuardianMask);
  }, []);

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
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "guardian_save_failed");
    } finally {
      setSessionActionLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-5">
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
              onClick={() => router.push("/")}
              className="px-3 py-1 rounded border border-slate-300 text-slate-700 font-bold"
            >
              トップへ戻る
            </button>
          </div>

          {guardianMask && <div className="text-slate-600">宛先: {guardianMask}</div>}
          {!studentId && (
            <div className="text-xs text-slate-500">
              保存後、トップページから学習を開始すると、終了時にレポート配信できます。
            </div>
          )}
          {sessionError && <div className="text-red-600">{sessionError}</div>}
        </section>
      </div>
    </main>
  );
}
