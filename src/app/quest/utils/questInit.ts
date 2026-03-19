export type LegacyQuestion = {
  val1: number;
  val2: number;
  operator: "+" | "-";
  answer: number;
};

export function createQuestion(): LegacyQuestion {
  const isAddition = Math.random() > 0.5;
  let val1: number;
  let val2: number;
  let answer: number;

  if (isAddition) {
    val1 = Math.floor(Math.random() * 20) + 1;
    val2 = Math.floor(Math.random() * 20) + 1;
    answer = val1 + val2;
  } else {
    val1 = Math.floor(Math.random() * 20) + 5;
    val2 = Math.floor(Math.random() * val1);
    answer = val1 - val2;
  }

  return {
    val1,
    val2,
    operator: isAddition ? "+" : "-",
    answer
  };
}
