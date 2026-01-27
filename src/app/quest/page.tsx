
'use client';

import { useState, useEffect, useRef } from 'react';
import ExplanationModal from '@/components/ExplanationModal';
import CanvasDraw from 'react-canvas-draw'; // Import CanvasDraw
import { createWorker } from 'tesseract.js'; // Import tesseract.js

type CharacterType = 'warrior' | 'mage';

interface Question {
  val1: number;
  val2: number;
  operator: '+' | '-';
  answer: number;
}

const CHARACTERS = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    color: 'bg-red-100 text-red-800',
    hits: ['Critical Hit!', 'Smash!', 'Take this!'],
    misses: ['Borrow 10 from the neighbor!', 'Don\'t give up!', 'Close, but no cigar!'],
    win: 'Victory is ours!'
  },
  mage: {
    name: 'Mage',
    emoji: '🪄',
    color: 'bg-blue-100 text-blue-800',
    hits: ['Calculated.', 'Just as planned.', 'Logic prevails.'],
    misses: ['Check the digits.', 'Reconfirm the calculation.', 'A slight miscalculation.'],
    win: 'A logical conclusion.'
  }
};

const preprocessCanvasImage = async (imageDataUrl: string, originalWidth: number, originalHeight: number) => {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const offscreenCanvas = document.createElement('canvas');
      const ctx = offscreenCanvas.getContext('2d');

      if (!ctx) {
        resolve(imageDataUrl); // Fallback
        return;
      }

      // Draw the original image onto a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.floor(originalWidth);
      tempCanvas.height = Math.floor(originalHeight);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        resolve(imageDataUrl);
        return;
      }
      tempCtx.fillStyle = '#ffffff'; // Ensure white background
      tempCtx.fillRect(0, 0, Math.floor(originalWidth), Math.floor(originalHeight));
      tempCtx.drawImage(img, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, Math.floor(originalWidth), Math.floor(originalHeight));
      const data = imgData.data;

      let minX = Math.floor(originalWidth), minY = Math.floor(originalHeight), maxX = 0, maxY = 0;

      // Binarization and find bounding box of non-white pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Convert to grayscale and binarize (threshold 128)
        const gray = (r + g + b) / 3;
        const isBlack = gray < 128; // Consider anything darker than mid-gray as "black"
        
        if (isBlack) {
          const x = (i / 4) % Math.floor(originalWidth);
          const y = Math.floor((i / 4) / Math.floor(originalWidth));

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);

          // Make the line thicker and fully black for OCR
          data[i] = 0;     // Red
          data[i + 1] = 0; // Green
          data[i + 2] = 0; // Blue
          data[i + 3] = 255; // Alpha
        } else {
          // Make background pure white
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }

      tempCtx.putImageData(imgData, 0, 0); // Apply binarized data back to tempCanvas

      const contentWidth = maxX - minX + 1;
      const contentHeight = maxY - minY + 1;

      if (contentWidth <= 0 || contentHeight <= 0) {
        resolve(imageDataUrl); // No content drawn, return original
        return;
      }

      // Create a new canvas for the cropped and resized image
      const padding = 20; // Add some padding around the cropped digit
      const targetSize = 200; // Standard size for OCR input

      offscreenCanvas.width = targetSize;
      offscreenCanvas.height = targetSize;

      if (ctx) { // Check if ctx is still valid after resizing
        ctx.fillStyle = '#ffffff'; // White background for the new canvas
        ctx.fillRect(0, 0, targetSize, targetSize);

        const aspectRatio = contentWidth / contentHeight;
        let drawWidth, drawHeight;

        if (aspectRatio > 1) { // Wider than tall
          drawWidth = targetSize - padding * 2;
          drawHeight = drawWidth / aspectRatio;
        } else { // Taller than wide or square
          drawHeight = targetSize - padding * 2;
          drawWidth = drawHeight * aspectRatio;
        }

        const drawX = (targetSize - drawWidth) / 2;
        const drawY = (targetSize - drawHeight) / 2;

        ctx.drawImage(
          tempCanvas,
          minX, minY, contentWidth, contentHeight, // Source rectangle
          drawX, drawY, drawWidth, drawHeight      // Destination rectangle
        );
      }
      resolve(offscreenCanvas.toDataURL("image/png"));
    };
    img.src = imageDataUrl;
  });
};

export default function QuestPage() {
  const [enemyHp, setEnemyHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('Battle Start!');
  const [character, setCharacter] = useState<CharacterType>('warrior');
  const [status, setStatus] = useState<'playing' | 'cleared'>('playing');
  const [showExplanation, setShowExplanation] = useState(false);
  const [inputMode, setInputMode] = useState<'numpad' | 'handwriting'>('numpad'); // New state for input mode
  const [isRecognizing, setIsRecognizing] = useState(false); // New state for OCR loading
  const [recognizedNumber, setRecognizedNumber] = useState<string | null>(null); // To display recognized number
  const canvasRef = useRef<any>(null); // Ref for CanvasDraw component
  const tesseractWorkerRef = useRef<Tesseract.Worker | null>(null);

  useEffect(() => {
    const initializeWorker = async () => {
      tesseractWorkerRef.current = await createWorker("eng");
      await tesseractWorkerRef.current.setParameters({
        tessedit_char_whitelist: "0123456789",
        psm: 10, // PSM_SINGLE_CHAR for single digit recognition
      });
    };

    initializeWorker();

    return () => {
      if (tesseractWorkerRef.current) {
        tesseractWorkerRef.current.terminate();
        tesseractWorkerRef.current = null;
      }
    };
  }, []);

  // Initialize first question
  useEffect(() => {
    generateQuestion();
  }, []);

  const generateQuestion = () => {
    // Generate simple addition/subtraction
    const isAddition = Math.random() > 0.5;
    let val1, val2, ans;

    if (isAddition) {
      val1 = Math.floor(Math.random() * 20) + 1;
      val2 = Math.floor(Math.random() * 20) + 1;
      ans = val1 + val2;
    } else {
      val1 = Math.floor(Math.random() * 20) + 5;
      val2 = Math.floor(Math.random() * val1); // Ensure result is non-negative
      ans = val1 - val2;
    }

    setQuestion({
      val1,
      val2,
      operator: isAddition ? '+' : '-',
      answer: ans
    });
    setInput('');
  };

  const handleInput = (num: string) => {
    if (status !== 'playing') return;
    if (input.length < 3) {
      setInput(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (status !== 'playing') return;
    setInput(prev => prev.slice(0, -1));
  };

  const handleAttack = () => {
    if (status !== 'playing' || !question) return;

    const playerAns = parseInt(input);
    
    if (isNaN(playerAns)) return;

    if (playerAns === question.answer) {
      // Correct
      const damage = 10 + (combo * 2);
      const newHp = Math.max(0, enemyHp - damage);
      setEnemyHp(newHp);
      
      const newCombo = combo + 1;
      setCombo(newCombo);

      const charData = CHARACTERS[character];
      let hitMsg = charData.hits[Math.floor(Math.random() * charData.hits.length)];
      if (newCombo >= 3) {
        hitMsg += ` (Combo x${newCombo}!)`;
      }
      setMessage(hitMsg);

      if (newHp === 0) {
        setStatus('cleared');
        setMessage(charData.win);
      } else {
        generateQuestion();
      }
    } else {
      // Incorrect
      setCombo(0);
      const charData = CHARACTERS[character];
      setMessage(charData.misses[Math.floor(Math.random() * charData.misses.length)]);
      
      // Check if explanation is needed (Carry over addition)
      if (question.operator === '+' && !showExplanation) {
        const val1 = question.val1;
        const val2 = question.val2;
        // Check carry over: (val1 % 10) + (val2 % 10) >= 10
        // And make sure val2 is large enough to lend the needed amount (basic sanity check)
        const distToTen = 10 - (val1 % 10);
        const needsExplanation = (val1 % 10) + (val2 % 10) >= 10;

        if (needsExplanation) {
          setShowExplanation(true);
          // Don't clear input immediately so they can see what they got wrong?
          // Actually user said "Reset problem" after explanation.
          return;
        }
      }
      
      setInput('');
    }
  };

  const handleExplanationClose = () => {
    setShowExplanation(false);
    generateQuestion(); // Reset/New problem as per instruction
  };

  const toggleCharacter = () => {
    setCharacter(prev => prev === 'warrior' ? 'mage' : 'warrior');
  };

  const handleHandwritingJudge = async () => {
    if (!canvasRef.current || !question || isRecognizing) return;

    setIsRecognizing(true);
    setMessage("解析中...");
    setRecognizedNumber(null); // Clear previous recognition

    const imageDataUrl = canvasRef.current.getDataURL("png", false, "#ffffff");
    const preprocessedImageData = await preprocessCanvasImage(imageDataUrl, canvasRef.current.canvas.width, canvasRef.current.canvas.height);

    if (!tesseractWorkerRef.current) {
      setMessage("OCR初期化中...少々お待ちください。");
      setIsRecognizing(false);
      return;
    }

    const { data: { text } } = await tesseractWorkerRef.current.recognize(preprocessedImageData);
    
    const recognizedNum = parseInt(text.trim().replace(/\D/g, "")); // Clean up recognized text
    setRecognizedNumber(isNaN(recognizedNum) ? null : recognizedNum.toString());

    if (isNaN(recognizedNum)) {
      setMessage("数字を認識できませんでした。もう一度お試しください。");
      setCombo(0);
    } else {
      setMessage(`認識結果: ${recognizedNum}`);
      // Simulate handleAttack logic
      if (recognizedNum === question.answer) {
        // Correct
        const damage = 10 + (combo * 2);
        const newHp = Math.max(0, enemyHp - damage);
        setEnemyHp(newHp);

        const newCombo = combo + 1;
        setCombo(newCombo);

        const charData = CHARACTERS[character];
        let hitMsg = charData.hits[Math.floor(Math.random() * charData.hits.length)];
        if (newCombo >= 3) {
          hitMsg += ` (Combo x${newCombo}!)`;
        }
        setMessage(hitMsg);

        if (newHp === 0) {
          setStatus("cleared");
          setMessage(charData.win);
        } else {
          generateQuestion();
        }
      } else {
        // Incorrect
        setCombo(0);
        const charData = CHARACTERS[character];
        setMessage(charData.misses[Math.floor(Math.random() * charData.misses.length)]);

        // Check if explanation is needed (Carry over addition)
        if (question.operator === "+" && !showExplanation) {
          const val1 = question.val1;
          const val2 = question.val2;
          const needsExplanation = (val1 % 10) + (val2 % 10) >= 10;

          if (needsExplanation) {
            setShowExplanation(true);
            return;
          }
        }
      }
    }

    canvasRef.current?.clear();
    setIsRecognizing(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 max-w-md mx-auto border-x border-slate-200 shadow-sm relative">
      {/* Debug Button */}
      <button
        onClick={() => setShowExplanation(true)}
        className="absolute top-4 left-4 px-3 py-1 bg-purple-500 text-white text-xs rounded-md shadow-md z-[9999]"
      >
        【テスト】さくらんぼ解説を表示
      </button>

      {/* Input Mode Toggle */}
      <div className="absolute top-4 right-4 flex bg-slate-200 rounded-md p-1 shadow-md z-[9999]">
        <button
          onClick={() => setInputMode('numpad')}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${inputMode === 'numpad' ? 'bg-indigo-500 text-white shadow' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          テンキー
        </button>
        <button
          onClick={() => setInputMode('handwriting')}
          className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${inputMode === 'handwriting' ? 'bg-indigo-500 text-white shadow' : 'text-slate-700 hover:bg-slate-100'}`}
        >
          手書き
        </button>
      </div>
      
      {/* Explanation Modal */}
      {showExplanation && question && (
        <ExplanationModal
          val1={question.val1}
          val2={question.val2}
          character={character}
          onClose={handleExplanationClose}
        />
      )}

      {/* Top: Enemy HP */}
      <div className="w-full pt-4 space-y-2">
        <div className="flex justify-between items-center text-slate-700 font-bold">
          <span>Enemy</span>
          <span>👾</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-6 border-2 border-slate-300 overflow-hidden relative">
          <div 
            className="bg-red-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${enemyHp}%` }}
          ></div>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md">
            HP {enemyHp}/100
          </span>
        </div>
      </div>

      {/* Center: Character & Message */} 
      <div className="flex flex-col items-center space-y-4 my-4 flex-1 justify-center w-full">
        {status === 'cleared' ? (
          <div className="text-center animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-yellow-600">STAGE CLEAR!</h2>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-yellow-500 text-white rounded-lg font-bold shadow-md active:translate-y-1"
            >
              Play Again
            </button>
          </div>
        ) : (
          <>
            <div 
              className={`p-4 rounded-xl shadow-md border-2 ${CHARACTERS[character].color} w-full text-center relative transition-colors`}
              onClick={toggleCharacter}
            >
              <div className="text-6xl mb-2">{CHARACTERS[character].emoji}</div>
              <p className="font-bold text-lg min-h-[1.75rem]">{message}</p>
              <span className="absolute top-2 right-2 text-xs opacity-50 bg-white/50 px-2 rounded cursor-pointer">
                ↻ Switch
              </span>
            </div>

            {/* Question */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-indigo-100 w-full text-center">
              {question && (
                <div className="text-4xl font-black text-indigo-900 tracking-wider">
                  {question.val1} {question.operator} {question.val2} = <span className={`${input ? 'text-indigo-600' : 'text-slate-300'} underline decoration-4 underline-offset-8`}>
                    {inputMode === 'handwriting' && recognizedNumber !== null ? recognizedNumber : input || '?'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Combo Indicator */}
            {combo >= 2 && (
              <div className="text-yellow-500 font-black text-xl animate-pulse">
                {combo} COMBO!
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom: Input Area */}
      {inputMode === 'numpad' ? (
        <div className="w-full grid grid-cols-3 gap-3 pb-4">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
            <button
              key={num}
              onClick={() => handleInput(num.toString())}
              disabled={status === 'cleared'}
              className={`
                h-16 rounded-xl text-2xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all
                ${num === 0 ? 'col-span-1' : ''}
                bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50
              `}
            >
              {num}
            </button>
          ))}
          
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={status === 'cleared'}
            className="h-16 rounded-xl text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200 flex items-center justify-center"
          >
            ⌫
          </button>

          {/* Attack/Enter Button */}
          <button
            onClick={handleAttack}
            disabled={status === 'cleared' || input === ''}
            className="h-16 rounded-xl text-xl font-bold shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all bg-indigo-500 text-white border-2 border-indigo-600 hover:bg-indigo-600 flex items-center justify-center"
          >
            Attack!
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4 pb-4">
          <CanvasDraw
            ref={canvasRef}
            hideGrid={true}
            brushRadius={3}
            brushColor="#4f46e5"
            canvasWidth={300}
            canvasHeight={300}
            className="rounded-xl border-2 border-slate-300 shadow-lg"
            disabled={status === 'cleared'}
          />
          <div className="flex gap-3 w-full justify-center">
            <button
              onClick={() => canvasRef.current?.clear()}
              disabled={status === 'cleared' || isRecognizing}
              className="px-6 py-2 bg-red-100 text-red-600 rounded-lg font-bold shadow-md active:translate-y-1"
            >
              リセット
            </button>
            <button
              onClick={() => handleHandwritingJudge()}
              disabled={status === 'cleared' || isRecognizing}
              className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-bold shadow-md active:translate-y-1"
            >
              {isRecognizing ? '解析中...' : '判定'}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
