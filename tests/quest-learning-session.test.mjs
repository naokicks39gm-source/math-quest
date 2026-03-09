import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const questPath = path.join(process.cwd(), "src/app/quest/page.tsx");
const source = fs.readFileSync(questPath, "utf8");

test("quest skill mode uses learning session lifecycle", () => {
  assert.equal(source.includes('const skillIdFromQuery = (params.get("skillId") ?? "").trim();'), true);
  assert.equal(source.includes('const isLearningSessionMode = Boolean(skillIdFromQuery);'), true);
  assert.equal(source.includes('fetch("/api/learning/session/start"'), true);
  assert.equal(source.includes('fetch(`/api/learning/session/${encodeURIComponent(sessionId)}`'), true);
  assert.equal(source.includes('fetch("/api/learning/session/answer"'), true);
  assert.equal(source.includes('fetch("/api/learning/session/finish"'), true);
  assert.equal(source.includes("index: answerIndex"), true);
  assert.equal(source.includes("answer: answerText"), true);
  assert.equal(source.includes("loadStateFromClient()"), true);
  assert.equal(source.includes("LEARNING_STATE_KEY"), true);
  assert.equal(source.includes('const LS_LEARNING_SESSION = "mq:learningSession";'), true);
  assert.equal(source.includes("if (storedSession.skillId !== skillId) {"), true);
  assert.equal(source.includes("clearLearningRecovery();"), true);
  assert.equal(source.includes('if (isLearningSessionMode) {'), true);
  assert.equal(source.includes('return postJson("/api/session/answer", {'), true);
  assert.equal(source.includes("<SessionResultView"), true);
});
