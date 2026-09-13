import React from 'react';
import { Combatant } from '../../types';
import { Skull, Crown } from 'lucide-react';

interface InitiativeRibbonProps {
  combatants: Combatant[];
  activeCombatantId: string | null;
  currentRound: number;
  onScrollTo: (id: string) => void;
}

export const InitiativeRibbon: React.FC<InitiativeRibbonProps> = ({
  combatants,
  activeCombatantId,
  currentRound,
  onScrollTo,
}) => {
  if (combatants.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 bg-dm-panelAlt border border-dm-border rounded-lg px-2 py-1.5 overflow-x-auto shrink-0 scrollbar-thin">
      {/* Round badge */}
      <div className="shrink-0 bg-dm-accent/20 text-dm-accent border border-dm-accent/30 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mr-1">
        R{currentRound || 1}
      </div>

      {combatants.map((c) => {
        const isActive = c.id === activeCombatantId;
        const isDead = c.currentHp <= 0;
        const hpPct = Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100));
        const isPlayer = c.type === 'player';

        return (
          <button
            key={c.id}
            onClick={() => onScrollTo(c.id)}
            title={`${c.name} — ${c.currentHp}/${c.maxHp} ХП, КД ${c.ac}, Иниц. ${c.initiative}`}
            className={`
              relative shrink-0 flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 min-w-[48px] max-w-[64px]
              transition-all cursor-pointer border
              ${isActive
                ? 'bg-dm-accent/20 border-dm-accent shadow-md shadow-dm-accent/20 scale-105'
                : isDead
                  ? 'bg-dm-bg/50 border-dm-border/50 opacity-50'
                  : 'bg-dm-bg border-dm-border hover:border-dm-accent/50 hover:bg-dm-card'
              }
            `}
          >
            {/* Active indicator dot */}
            {isActive && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-dm-accent animate-pulse" />
            )}

            {/* Avatar or icon */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isDead
                ? 'bg-gray-700 text-gray-500'
                : isPlayer
                  ? 'bg-dm-accent/30 text-dm-accent'
                  : 'bg-red-500/20 text-red-400'
            }`}>
              {c.avatar ? (
                <img src={c.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : isDead ? (
                <Skull className="w-3 h-3" />
              ) : isPlayer ? (
                <Crown className="w-3 h-3" />
              ) : (
                <span className="text-[9px]">{c.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Name */}
            <span className={`text-[9px] leading-tight truncate w-full text-center ${
              isActive ? 'text-dm-accent font-bold' : 'text-dm-textMuted'
            }`}>
              {c.name.length > 7 ? c.name.slice(0, 6) + '…' : c.name}
            </span>

            {/* HP bar */}
            <div className="w-full h-[3px] bg-dm-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isDead ? 'bg-gray-600' : hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* Initiative number */}
            <span className="text-[8px] text-dm-textSubtle">{c.initiative}</span>
          </button>
        );
      })}
    </div>
  );
};
