import "server-only";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { decryptEmail, encryptEmail, maskEmail } from "@/lib/server/crypto";

type SessionRow = {
  id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
  total: number;
  correct: number;
  accuracy: number;
};

type AnswerStat = {
  type_id: string;
  total: number;
  correct: number;
};

export type SessionInfo = {
  id: string;
  studentId: string;
  startedAt: string;
  endedAt: string | null;
  total: number;
  correct: number;
  accuracy: number;
};

export type SessionAnswer = {
  id: string;
  sessionId: string;
  typeId: string;
  prompt: string;
  predicted: string;
  correctAnswer: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type MailDeliveryRow = {
  id: string;
  status: string;
  errorCode: string | null;
  attempts: number;
  toMasked: string;
  sentAt: string;
  provider: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  bounceClass: string | null;
};

let dbSingleton: DatabaseSync | null = null;

const DB_PATH = process.env.MQ_DB_PATH || path.join(process.cwd(), "data", "mathquest.sqlite");

const addColumnIfMissing = (db: DatabaseSync, table: string, columnDef: string) => {
  const columnName = columnDef.trim().split(/\s+/)[0];
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === columnName)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
};

const initSchema = (db: DatabaseSync) => {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      parent_email_enc TEXT NOT NULL,
      parent_email_mask TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      total INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      accuracy REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      type_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      predicted TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS mail_deliveries (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      to_masked TEXT NOT NULL,
      status TEXT NOT NULL,
      error_code TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL UNIQUE,
      student_id TEXT NOT NULL,
      report_json TEXT NOT NULL,
      mail_subject TEXT NOT NULL,
      mail_text TEXT NOT NULL,
      mail_html TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id),
      FOREIGN KEY(student_id) REFERENCES students(id)
    );
  `);

  addColumnIfMissing(db, "mail_deliveries", "provider TEXT");
  addColumnIfMissing(db, "mail_deliveries", "provider_message_id TEXT");
  addColumnIfMissing(db, "mail_deliveries", "failure_reason TEXT");
  addColumnIfMissing(db, "mail_deliveries", "bounce_class TEXT");
};

export const getDb = () => {
  if (dbSingleton) return dbSingleton;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  dbSingleton = new DatabaseSync(DB_PATH);
  initSchema(dbSingleton);
  return dbSingleton;
};

export const upsertStudent = (displayName: string, parentEmail: string) => {
  const db = getDb();
  const now = new Date().toISOString();
  const parentEmailEnc = encryptEmail(parentEmail);
  const parentEmailMask = maskEmail(parentEmail);
  const existing = db
    .prepare("SELECT id FROM students WHERE display_name = ?")
    .get(displayName) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE students SET parent_email_enc=?, parent_email_mask=?, updated_at=? WHERE id=?"
    ).run(parentEmailEnc, parentEmailMask, now, existing.id);
    return { id: existing.id, displayName, parentEmailMask };
  }
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO students (id, display_name, parent_email_enc, parent_email_mask, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, displayName, parentEmailEnc, parentEmailMask, now, now);
  return { id, displayName, parentEmailMask };
};

export const getStudent = (studentId: string) => {
  const db = getDb();
  const row = db
    .prepare("SELECT id, display_name, parent_email_enc, parent_email_mask FROM students WHERE id = ?")
    .get(studentId) as
    | { id: string; display_name: string; parent_email_enc: string; parent_email_mask: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    parentEmailMask: row.parent_email_mask,
    parentEmail: decryptEmail(row.parent_email_enc)
  };
};

export const createSession = (studentId: string) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO sessions (id, student_id, started_at, ended_at, total, correct, accuracy) VALUES (?, ?, ?, NULL, 0, 0, 0)"
  ).run(id, studentId, now);
  return { id, startedAt: now };
};

export const recordAnswer = (params: {
  sessionId: string;
  typeId: string;
  prompt: string;
  predicted: string;
  correctAnswer: string;
  isCorrect: boolean;
}) => {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO answers (id, session_id, type_id, prompt, predicted, correct_answer, is_correct, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.sessionId,
    params.typeId,
    params.prompt,
    params.predicted,
    params.correctAnswer,
    params.isCorrect ? 1 : 0,
    now
  );
  return { id, answeredAt: now };
};

export const finalizeSession = (sessionId: string) => {
  const db = getDb();
  const now = new Date().toISOString();
  const session = db
    .prepare("SELECT id, student_id, started_at, ended_at, total, correct, accuracy FROM sessions WHERE id=?")
    .get(sessionId) as SessionRow | undefined;
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.ended_at) {
    return session;
  }
  const aggregate = db
    .prepare("SELECT COUNT(*) as total, SUM(is_correct) as correct FROM answers WHERE session_id=?")
    .get(sessionId) as { total: number; correct: number | null };
  const total = Number(aggregate.total ?? 0);
  const correct = Number(aggregate.correct ?? 0);
  const accuracy = total > 0 ? correct / total : 0;
  db.prepare("UPDATE sessions SET ended_at=?, total=?, correct=?, accuracy=? WHERE id=?").run(
    now,
    total,
    correct,
    accuracy,
    sessionId
  );
  return db
    .prepare("SELECT id, student_id, started_at, ended_at, total, correct, accuracy FROM sessions WHERE id=?")
    .get(sessionId) as SessionRow;
};

export const getPreviousSessionAccuracy = (studentId: string, beforeSessionId: string) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT accuracy FROM sessions
       WHERE student_id = ? AND id <> ? AND ended_at IS NOT NULL
       ORDER BY ended_at DESC LIMIT 1`
    )
    .get(studentId, beforeSessionId) as { accuracy: number } | undefined;
  return row?.accuracy ?? null;
};

const toSessionInfo = (row: SessionRow): SessionInfo => ({
  id: row.id,
  studentId: row.student_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  total: row.total,
  correct: row.correct,
  accuracy: row.accuracy
});

export const getSessionById = (sessionId: string): SessionInfo | null => {
  const db = getDb();
  const row = db
    .prepare("SELECT id, student_id, started_at, ended_at, total, correct, accuracy FROM sessions WHERE id = ?")
    .get(sessionId) as SessionRow | undefined;
  if (!row) return null;
  return toSessionInfo(row);
};

export const getSessionAnswers = (sessionId: string): SessionAnswer[] => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, session_id, type_id, prompt, predicted, correct_answer, is_correct, answered_at
       FROM answers
       WHERE session_id = ?
       ORDER BY answered_at ASC`
    )
    .all(sessionId) as Array<{
    id: string;
    session_id: string;
    type_id: string;
    prompt: string;
    predicted: string;
    correct_answer: string;
    is_correct: number;
    answered_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    typeId: row.type_id,
    prompt: row.prompt,
    predicted: row.predicted,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct === 1,
    answeredAt: row.answered_at
  }));
};

export const getRecentCompletedSessions = (studentId: string, beforeSessionId: string, limit = 3): SessionInfo[] => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, student_id, started_at, ended_at, total, correct, accuracy
       FROM sessions
       WHERE student_id = ? AND id <> ? AND ended_at IS NOT NULL
       ORDER BY ended_at DESC
       LIMIT ?`
    )
    .all(studentId, beforeSessionId, limit) as SessionRow[];
  return rows.map(toSessionInfo);
};

export const getSessionTypeStats = (sessionId: string) => {
  const db = getDb();
  return db
    .prepare(
      `SELECT type_id, COUNT(*) as total, SUM(is_correct) as correct
       FROM answers WHERE session_id = ?
       GROUP BY type_id`
    )
    .all(sessionId) as AnswerStat[];
};

export const getMailDelivery = (sessionId: string) => {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, status, error_code, attempts, to_masked, sent_at, provider, provider_message_id, failure_reason, bounce_class
       FROM mail_deliveries
       WHERE session_id = ?`
    )
    .get(sessionId) as
    | {
        id: string;
        status: string;
        error_code: string | null;
        attempts: number;
        to_masked: string;
        sent_at: string;
        provider: string | null;
        provider_message_id: string | null;
        failure_reason: string | null;
        bounce_class: string | null;
      }
    | undefined;
};

export const upsertMailDelivery = (params: {
  sessionId: string;
  toMasked: string;
  status: "sent" | "failed";
  errorCode: string | null;
  attempts: number;
  provider: string | null;
  providerMessageId: string | null;
  failureReason: string | null;
  bounceClass: string | null;
}) => {
  const db = getDb();
  const existing = getMailDelivery(params.sessionId);
  const now = new Date().toISOString();
  if (existing) {
    db.prepare(
      `UPDATE mail_deliveries
       SET to_masked=?, status=?, error_code=?, attempts=?, sent_at=?, provider=?, provider_message_id=?, failure_reason=?, bounce_class=?
       WHERE session_id=?`
    ).run(
      params.toMasked,
      params.status,
      params.errorCode,
      params.attempts,
      now,
      params.provider,
      params.providerMessageId,
      params.failureReason,
      params.bounceClass,
      params.sessionId
    );
    return;
  }
  db.prepare(
    `INSERT INTO mail_deliveries (
      id, session_id, to_masked, status, error_code, attempts, sent_at, provider, provider_message_id, failure_reason, bounce_class
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    params.sessionId,
    params.toMasked,
    params.status,
    params.errorCode,
    params.attempts,
    now,
    params.provider,
    params.providerMessageId,
    params.failureReason,
    params.bounceClass
  );
};

export const saveSessionReport = (params: {
  sessionId: string;
  studentId: string;
  reportJson: string;
  mailSubject: string;
  mailText: string;
  mailHtml: string;
}) => {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT id FROM session_reports WHERE session_id = ?")
    .get(params.sessionId) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE session_reports
       SET student_id=?, report_json=?, mail_subject=?, mail_text=?, mail_html=?, created_at=?
       WHERE session_id=?`
    ).run(
      params.studentId,
      params.reportJson,
      params.mailSubject,
      params.mailText,
      params.mailHtml,
      now,
      params.sessionId
    );
    return;
  }
  db.prepare(
    `INSERT INTO session_reports (id, session_id, student_id, report_json, mail_subject, mail_text, mail_html, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    params.sessionId,
    params.studentId,
    params.reportJson,
    params.mailSubject,
    params.mailText,
    params.mailHtml,
    now
  );
};
