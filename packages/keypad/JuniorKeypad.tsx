import { SecondaryMathKeypad } from "./HighSchoolKeypad";

type Props = {
  isPlaying: boolean;
  isStarting: boolean;
  isAnswerLocked: boolean;
  canSubmit: boolean;
  canUseKeyToken: (token: string) => boolean;
  onInput: (token: string) => void;
  onDelete: () => void;
  onJudge: () => void;
  onEnd: () => void;
  endDisabled?: boolean;
  judgeLabel: string;
  endLabel?: string;
};

export default function JuniorKeypad(props: Props) {
  return <SecondaryMathKeypad mode="junior" {...props} />;
}
