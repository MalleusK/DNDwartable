import React, { useState } from 'react';
import { Combatant } from '../../types';
import { db } from '../../db/db';
import { Shield, Heart, ChevronDown, Skull, Crown, Dices } from 'lucide-react';
import { executeRollAndLog } from '../../utils/dice';

interface CombatantCompactRowProps {
  combatant: Combatant;
  isActive: boolean;
  onExpand: () => void;
}

export const CombatantCompactRow: React.FC<CombatantCompactRowProps> = ({
  combatant,
  isActive,
  onExpand,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isDead = combatant.currentHp <= 0;
  const hpPct = Math.max(0, Math.min(100, (combatant.currentHp / combatant.maxHp) * 100));
  const isPlayer = combatant.type === 'player';

  const updateHp = async (amount: number) => {
    let current = Math.max(0, combatant.currentHp);
    let temp = Math.max(0, combatant.tempHp || 0);

    if (amount < 0) {
      const damage = Math.abs(amount);
      if (temp > 0) {
        if (damage <= temp) {
          temp -= damage;
        } else {
          current = Math.max(0, current - (damage - temp));
          temp = 0;
        }
      } else {
        current = Math.max(0, current - damage);
      }
    } else {
      current = Math.min(combatant.maxHp, current + amount);
    }

    await db.combatants.update(combatant.id, {
      currentHp: Math.max(0, current),
      tempHp: Math.max(0, temp),
    });
  };

  const handleDelete = async () => {
    const camp = await db.campaigns.get(combatant.campaignId);
    if (camp && camp.activeCombatantId === combatant.id) {
      await db.campaigns.update(combatant.campaignId, { activeCombatantId: null });
    }
    await db.combatants.delete(combatant.id);
  };

  const handleRollD20 = async () => {
    const mod = combatant.stats ? Math.floor((combatant.stats.dex - 10) / 2) : 0;
    await executeRollAndLog(`d20${mod >= 0 ? '+' + mod : String(mod)}`);
  };

  const quickDamageValues = [-5, -3, -1];
  const quickHealValues = [1, 3, 5];

  return (
    <div
      className={`
        flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all border text-xs
        ${isActive
          ? 'bg-dm-accent/10 border-dm-accent/60 shadow-md shadow-dm-accent/10'
          : isDead
            ? 'bg-dm-bg/50 border-dm-border/50 opacity-60'
            : 'bg-dm-card border-dm-border hover:border-dm-accent/30'
        }
      `}
    >
      {/* Initiative */}
      <div className={`w-6 text-center font-bold ${isActive ? 'text-dm-accent' : 'text-dm-textMuted'}`}>
        {combatant.initiative}
      </div>

      {/* Type icon */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
        isDead ? 'bg-gray-700 text-gray-500' : isPlayer ? 'bg-dm-accent/20 text-dm-accent' : 'bg-red-500/15 text-red-400'
      }`}>
        {isDead ? <Skull className="w-3 h-3" /> : isPlayer ? <Crown className="w-3 h-3" /> : <span className="text-[9px] font-bold">{combatant.name.charAt(0)}</span>}
      </div>

      {/* Name */}
      <button
        onClick={onExpand}
        className={`flex-1 min-w-0 text-left truncate font-medium hover:text-dm-accent transition-colors ${
          isActive ? 'text-dm-text' : isDead ? 'text-dm-textSubtle line-through' : 'text-dm-text'
        }`}
        title={`${combatant.name} — нажмите для подробностей`}
      >
        {combatant.name}
      </button>

      {/* Conditions badges */}
      {combatant.conditions.length > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {combatant.conditions.slice(0, 3).map((cond) => (
            <span key={cond} className="w-2 h-2 rounded-full bg-amber-500/60" title={cond} />
          ))}
          {combatant.conditions.length > 3 && (
            <span className="text-[8px] text-amber-400">+{combatant.conditions.length - 3}</span>
          )}
        </div>
      )}

      {/* Quick damage */}
      <div className="flex gap-0.5 shrink-0">
        {quickDamageValues.map(v => (
          <button
            key={v}
            onClick={() => updateHp(v)}
            className="w-6 h-6 rounded bg-red-500/15 text-red-400 hover:bg-red-500/30 text-[10px] font-bold transition-colors flex items-center justify-center"
            title={`${v} ХП`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* HP */}
      <div className="flex items-center gap-1 shrink-0 min-w-[64px]" title={`${combatant.currentHp}/${combatant.maxHp} ХП${combatant.tempHp ? ` + ${combatant.tempHp} ТХП` : ''}`}>
        <Heart className={`w-3 h-3 shrink-0 ${isDead ? 'text-gray-500' : 'text-red-400'}`} />
        <div className="flex flex-col gap-0.5 min-w-[48px]">
          <span className={`text-[11px] font-bold leading-none ${isDead ? 'text-gray-500' : hpPct > 50 ? 'text-emerald-400' : hpPct > 25 ? 'text-amber-400' : 'text-red-400'}`}>
            {combatant.currentHp}/{combatant.maxHp}
            {combatant.tempHp > 0 && <span className="text-cyan-400 ml-0.5">+{combatant.tempHp}</span>}
          </span>
          <div className="w-full h-[2px] bg-dm-bg rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isDead ? 'bg-gray-600' : hpPct > 50 ? 'bg-emerald-500' : hpPct > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick heal */}
      <div className="flex gap-0.5 shrink-0">
        {quickHealValues.map(v => (
          <button
            key={v}
            onClick={() => updateHp(v)}
            className="w-6 h-6 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold transition-colors flex items-center justify-center"
            title={`+${v} ХП`}
          >
            +{v}
          </button>
        ))}
      </div>

      {/* AC */}
      <div className="flex items-center gap-0.5 shrink-0 text-dm-textMuted" title={`КД ${combatant.ac}`}>
        <Shield className="w-3 h-3 text-blue-400" />
        <span className="text-[11px] font-bold text-blue-400">{combatant.ac}</span>
      </div>

      {/* Roll d20 */}
      <button
        onClick={handleRollD20}
        className="w-6 h-6 rounded bg-dm-accent/15 text-dm-accent hover:bg-dm-accent/30 flex items-center justify-center transition-colors shrink-0"
        title="Бросок d20"
      >
        <Dices className="w-3 h-3" />
      </button>

      {/* Expand */}
      <button
        onClick={onExpand}
        className="w-5 h-5 rounded text-dm-textSubtle hover:text-dm-text flex items-center justify-center shrink-0"
        title="Развернуть карточку"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {/* Delete */}
      {isConfirmingDelete ? (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={handleDelete}
            className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-bold"
          >
            Да
          </button>
          <button
            onClick={() => setIsConfirmingDelete(false)}
            className="px-1.5 py-0.5 bg-dm-card text-dm-textMuted rounded text-[9px]"
          >
            Нет
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsConfirmingDelete(true)}
          className="w-5 h-5 rounded text-dm-textSubtle hover:text-red-400 flex items-center justify-center shrink-0"
          title="Удалить"
        >
          ×
        </button>
      )}
    </div>
  );
};
