export function useSkipFromExplanation(deps:any){

  const skipFromExplanation = ()=>{

    if (deps.quest.status !== "playing" || !deps.currentItem) return;

    deps.setQuestionResults((prev:any)=>({
      ...prev,
      [deps.currentQuestionIndex]:{
        prompt: deps.currentItem.prompt,
        promptTex: deps.currentItem.prompt_tex,
        userAnswer:"",
        correct:false,
        correctAnswer: deps.currentItem.answer,
        everWrong:false,
        skipped:true
      }
    }));

    deps.setPracticeResult(null);

    deps.setShowSecondaryExplanation(false);
    deps.setShowSecondaryHint(false);
    deps.setShowElementaryHint(false);
    deps.setShowElementaryExplanation(false);

    if (deps.isLearningSessionMode){
      deps.resetQuestionUi();
      return;
    }

    deps.nextQuestion();

  };

  return { skipFromExplanation };

}