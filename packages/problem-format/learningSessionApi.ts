import type { LearningState, Recommendation, Session, SessionResult } from "packages/learning-engine";

export type LearningSessionStartResponse = {
  state: LearningState;
  session: Session;
};

export type LearningSessionAnswerResponse = {
  state: LearningState;
  session: Session;
};

export type LearningSessionFinishResponse = {
  state: LearningState;
  result: SessionResult;
};

export type LearningClientRecommendation = {
  action: Recommendation;
};
