import { useEffect } from "react";
import {
  loadMnistModel,
  loadMnist2DigitModel,
  isModelLoaded,
  is2DigitModelLoaded
} from "@/utils/mnistModel";
import { useQuestRecognition } from "./useQuestRecognition";

export function useQuestRecognitionFlow(args: any) {
  const recognition = useQuestRecognition(args);
  const {
    setIsModelReady,
    setIs2DigitModelReady,
    idleCheckTimerRef,
    inkFirstMode,
    autoJudgeEnabled,
    isStarting,
    quest,
    isDrawingRef,
    cooldownUntilRef,
    isRecognizing,
    inFlightRef,
    lastDrawAtRef,
    autoRecognizeTimerRef,
    pendingRecognizeRef,
    startTimersRef,
    setHasStarted,
    setStartPopup,
    setIsStarting,
    setMessage
  } = args;

  useEffect(() => {
    const loadModel = async () => {
      await loadMnistModel();
      await loadMnist2DigitModel();
      if (isModelLoaded) {
        setIsModelReady(true);
      }
      if (is2DigitModelLoaded) {
        setIs2DigitModelReady(true);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (idleCheckTimerRef.current) {
      window.clearInterval(idleCheckTimerRef.current);
    }
    if (inkFirstMode) return;
    idleCheckTimerRef.current = window.setInterval(() => {
      if (!autoJudgeEnabled) return;
      if (isStarting) return;
      if (quest.status !== "playing") return;
      if (isDrawingRef.current) return;
      if (Date.now() < cooldownUntilRef.current) return;
      if (isRecognizing || inFlightRef.current) return;
      const idleFor = Date.now() - lastDrawAtRef.current;
      const nextDelay = args.getAutoJudgeDelayMs(recognition.getAnswerDigits());
      if (idleFor >= nextDelay && lastDrawAtRef.current > 0) {
        recognition.runInference();
      }
    }, 200);
    return () => {
      if (idleCheckTimerRef.current) {
        window.clearInterval(idleCheckTimerRef.current);
      }
    };
  }, [inkFirstMode, autoJudgeEnabled, isStarting, quest.status, isRecognizing, args.itemIndex]);

  const startReadyGo = () => {
    if (args.isStarting) return;
    setHasStarted(true);
    setIsStarting(true);
    setStartPopup("ready");
    setMessage("Ready...");
    const speak = (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    };
    speak("Ready");
    startTimersRef.current.forEach((t: number) => window.clearTimeout(t));
    const t1 = window.setTimeout(() => {
      setStartPopup("go");
      setMessage("Go!");
      speak("Go");
    }, 700);
    const t2 = window.setTimeout(() => {
      setStartPopup(null);
      setIsStarting(false);
      setMessage("Battle Start!");
      if (autoJudgeEnabled && pendingRecognizeRef.current) {
        pendingRecognizeRef.current = false;
        if (autoRecognizeTimerRef.current) {
          window.clearTimeout(autoRecognizeTimerRef.current);
        }
        const nextDelay = args.getAutoJudgeDelayMs(recognition.getAnswerDigits());
        autoRecognizeTimerRef.current = window.setTimeout(() => {
          recognition.runInference();
        }, nextDelay);
      }
    }, 2000);
    startTimersRef.current = [t1, t2];
  };

  return {
    recognition,
    ...recognition,
    startReadyGo
  };
}
