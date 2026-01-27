'use client';

import { useState, useEffect } from 'react';
import ExplanationModal from '@/components/ExplanationModal';

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

export default function QuestPage() {
  const [enemyHp, setEnemyHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('Battle Start!');
  const [character, setCharacter] = useState<CharacterType>('warrior');
  const [status, setStatus] = useState<'playing' | 'cleared'>('playing');
  const [showExplanation, setShowExplanation] = useState(false);

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 max-w-md mx-auto border-x border-slate-200 shadow-sm relative">
      
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
                    {input || '?'}
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

      {/* Bottom: Numpad */}
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

    </main>
  );
}
