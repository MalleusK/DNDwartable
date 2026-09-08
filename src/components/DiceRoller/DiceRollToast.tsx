import React, { useState, useEffect } from 'react';
import { DiceRollLog } from '../../types';
import { Dices, Sparkles, X } from 'lucide-react';

export const DiceRollToast: React.FC = () => {
  const [currentRoll, setCurrentRoll] = useState<DiceRollLog | null>(null);

  useEffect(() => {
    const handleRollEvent = (e: CustomEvent<DiceRollLog>) => {
      setCurrentRoll(e.detail);
      const timer = setTimeout(() => {
        setCurrentRoll(null);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('dm-dice-roll' as any, handleRollEvent);
    return () => {
      window.removeEventListener('dm-dice-roll' as any, handleRollEvent);
    };
  }, []);

  if (!currentRoll) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounceIn max-w-sm pointer-events-auto">
      <div className={`p-3.5 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 bg-dm-panel/95 ${
        currentRoll.isCrit 
          ? 'border-amber-500/80 shadow-amber-500/20 ring-1 ring-amber-400' 
          : currentRoll.isFumble 
            ? 'border-red-500/80 shadow-red-500/20 ring-1 ring-red-400' 
            : 'border-dm-accent/60 shadow-dm-accent/15'
      }`}>
        {/* Icon & Total */}
        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-mono font-black shrink-0 ${
          currentRoll.isCrit 
            ? 'bg-amber-500 text-black animate-pulse' 
            : currentRoll.isFumble 
              ? 'bg-red-600 text-white' 
              : 'bg-dm-accent text-white'
        }`}>
          <span className="text-xl leading-none">{currentRoll.total}</span>
          <span className="text-[9px] uppercase tracking-tighter opacity-80">Итог</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Dices className="w-3.5 h-3.5 text-dm-textMuted" />
            <span className="text-xs font-bold text-dm-text truncate">
              {currentRoll.formula}
            </span>
          </div>
          <div className="text-[11px] text-dm-textMuted mt-0.5 flex items-center gap-1">
            <span>Кубы: [{currentRoll.results.join(', ')}]</span>
            {currentRoll.modifier !== 0 && (
              <span>{currentRoll.modifier >= 0 ? `+${currentRoll.modifier}` : currentRoll.modifier}</span>
            )}
            {currentRoll.isCrit && (
              <span className="text-amber-400 font-bold ml-1 flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" /> Критический успех!
              </span>
            )}
            {currentRoll.isFumble && (
              <span className="text-red-400 font-bold ml-1">
                Критический провал!
              </span>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button 
          onClick={() => setCurrentRoll(null)}
          className="text-dm-textMuted hover:text-dm-text p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
