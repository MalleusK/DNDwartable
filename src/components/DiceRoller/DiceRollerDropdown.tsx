import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { rollDice } from '../../utils/dice';
import { Dices, History, X } from 'lucide-react';
import { DiceRollLog } from '../../types';


export const DiceRollerDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modifier, setModifier] = useState<number>(0);
  const [lastRoll, setLastRoll] = useState<DiceRollLog | null>(null);

  const rollLogs = useLiveQuery(
    () => db.diceRollLogs.orderBy('timestamp').reverse().limit(5).toArray(),
    []
  );

  const handleRoll = async (sides: number) => {
    try {
      const formula = `1d${sides}${modifier >= 0 ? '+' : ''}${modifier}`;
      const result = rollDice(formula);
      const isCrit = sides === 20 && result.rolls[0] === 20;
      const isFumble = sides === 20 && result.rolls[0] === 1;

      const logEntry: DiceRollLog = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        formula,
        results: result.rolls,
        modifier: result.modifier,
        total: result.total,
        isCrit,
        isFumble,
      };

      await db.diceRollLogs.add(logEntry);
      setLastRoll(logEntry);
    } catch (err) {
      console.error(err);
    }
  };

  const diceList = [4, 6, 8, 10, 12, 20, 100];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-dm-card hover:bg-dm-cardHover border border-dm-border text-dm-text text-sm font-medium transition-colors"
      >
        <Dices className="w-4 h-4 text-dm-accent" />
        <span>Кубы</span>
        {lastRoll && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
            lastRoll.isCrit ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
            lastRoll.isFumble ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
            'bg-dm-panel text-dm-accent'
          }`}>
            {lastRoll.total}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-dm-panel border border-dm-border rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-dm-border pb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-dm-text">
              <Dices className="w-4 h-4 text-dm-accent" />
              <span>Бросок кубика</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-dm-textMuted hover:text-dm-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Сетка кубиков */}
          <div className="grid grid-cols-4 gap-1.5">
            {diceList.map((d) => (
              <button
                key={d}
                onClick={() => handleRoll(d)}
                className="px-2 py-2 rounded bg-dm-card hover:bg-dm-accent hover:text-white border border-dm-border text-dm-text text-xs font-bold font-mono transition-all text-center"
              >
                d{d}
              </button>
            ))}
          </div>

          {/* Модификатор */}
          <div className="flex items-center justify-between bg-dm-card px-2.5 py-1.5 rounded border border-dm-border text-xs">
            <span className="text-dm-textMuted">Модификатор:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setModifier((m) => m - 1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-dm-panel border border-dm-border text-dm-text font-mono hover:border-dm-accent"
              >
                -
              </button>
              <input
                type="number"
                value={modifier}
                onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                className="w-10 text-center bg-dm-panel border border-dm-border rounded py-0.5 text-xs text-dm-text font-mono focus:outline-none focus:border-dm-accent"
              >
              </input>
              <button
                onClick={() => setModifier((m) => m + 1)}
                className="w-5 h-5 flex items-center justify-center rounded bg-dm-panel border border-dm-border text-dm-text font-mono hover:border-dm-accent"
              >
                +
              </button>
              <button
                onClick={() => setModifier(0)}
                className="text-[10px] text-dm-textMuted hover:text-dm-text ml-1 underline"
              >
                0
              </button>
            </div>
          </div>

          {/* Лог последних 5 бросков */}
          <div className="flex flex-col gap-1.5 border-t border-dm-border pt-2">
            <div className="flex items-center gap-1 text-xs text-dm-textMuted">
              <History className="w-3.5 h-3.5" />
              <span>Последние броски (5)</span>
            </div>

            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {(!rollLogs || rollLogs.length === 0) && (
                <div className="text-[11px] text-dm-textSubtle italic py-1 text-center">
                  Бросков пока не было
                </div>
              )}
              {rollLogs?.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between px-2 py-1 rounded bg-dm-card text-xs"
                >
                  <span className="text-dm-textMuted font-mono">{log.formula}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-dm-textSubtle">
                      [{log.results.join(', ')}]
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        log.isCrit
                          ? 'text-amber-400'
                          : log.isFumble
                          ? 'text-red-400'
                          : 'text-dm-accent'
                      }`}
                    >
                      {log.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

