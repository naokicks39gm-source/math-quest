import "server-only";

import {
  createSession,
  finalizeSession,
  getMailDelivery,
  getStudent,
  recordAnswer,
  saveSessionReport,
  upsertMailDelivery
} from "@/lib/server/db";
import { maskEmail } from "@/lib/server/crypto";
import { buildGuardianReport, renderGuardianReportMail } from "@/lib/server/report";
import { getMailProvider } from "@/lib/server/mail";

export const startSessionForStudent = (studentId: string) => {
  const student = getStudent(studentId);
  if (!student) {
    throw new Error("Student not found");
  }
  return createSession(studentId);
};

export const appendAnswer = (params: {
  sessionId: string;
  typeId: string;
  prompt: string;
  predicted: string;
  correctAnswer: string;
  isCorrect: boolean;
}) => {
  return recordAnswer(params);
};

export const endSessionAndSendReport = async (sessionId: string) => {
  const existingDelivery = getMailDelivery(sessionId);
  const session = finalizeSession(sessionId);
  const student = getStudent(session.student_id);
  if (!student) {
    throw new Error("Student not found");
  }
  const report = buildGuardianReport({
    sessionId: session.id,
    studentId: session.student_id,
    total: session.total,
    correct: session.correct,
    accuracy: session.accuracy,
    startedAt: session.started_at,
    endedAt: session.ended_at ?? new Date().toISOString()
  });
  const mail = renderGuardianReportMail(student.displayName, report);
  saveSessionReport({
    sessionId: session.id,
    studentId: session.student_id,
    reportJson: JSON.stringify(report),
    mailSubject: mail.subject,
    mailText: mail.text,
    mailHtml: mail.html
  });

  if (existingDelivery?.status === "sent") {
    return {
      report,
      mail: {
        status: "sent",
        attempts: existingDelivery.attempts,
        toMasked: existingDelivery.to_masked,
        errorCode: existingDelivery.error_code,
        provider: existingDelivery.provider,
        providerMessageId: existingDelivery.provider_message_id,
        failureReason: existingDelivery.failure_reason,
        bounceClass: existingDelivery.bounce_class
      }
    };
  }

  const provider = getMailProvider();
  const send = await provider.send({
    to: student.parentEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
  upsertMailDelivery({
    sessionId,
    toMasked: maskEmail(student.parentEmail),
    status: send.ok ? "sent" : "failed",
    errorCode: send.errorCode,
    attempts: send.attempts,
    provider: send.provider,
    providerMessageId: send.providerMessageId,
    failureReason: send.failureReason,
    bounceClass: send.bounceClass
  });
  return {
    report,
    mail: {
      status: send.ok ? "sent" : "failed",
      attempts: send.attempts,
      toMasked: maskEmail(student.parentEmail),
      errorCode: send.errorCode,
      provider: send.provider,
      providerMessageId: send.providerMessageId,
      failureReason: send.failureReason,
      bounceClass: send.bounceClass
    }
  };
};
