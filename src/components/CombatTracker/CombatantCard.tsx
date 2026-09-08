import React, { useState, useRef } from 'react';
import { Combatant } from '../../types';

import { db } from '../../db/db';
import { DND_CONDITIONS } from '../../data/conditions';
import { Shield, Eye, Trash2, Copy, Plus, Image as ImageIcon } from 'lucide-react';
import { resizeImage } from '../../utils/imageResize';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onOpenSpell: (spellId: string) => void;
}

export const CombatantCard: React.FC<CombatantCardProps> = ({ combatant, isActive, onOpenSpell }) => {
  const [hpInput, setHpInput] = useState('');
  const [isEditingHp, setIsEditingHp] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (confirm(`Удалить ${combatant.name}?`)) {
      await db.combatants.delete(combatant.id);
    }
  };

  const handleDuplicate = async () => {
    const newCombatant: Combatant = {
      ...combatant,
      id: crypto.randomUUID(),
      name: `${combatant.name} (Копия)`,
    };
    await db.combatants.add(newCombatant);
  };

  const updateHp = async (amount: number) => {
    let newHp = combatant.currentHp + amount;
    if (newHp > combatant.maxHp) newHp = combatant.maxHp;
    if (newHp < 0) newHp = 0;
    
    // Если получаем урон и есть Temp HP, сначала вычитаем из Temp HP
    let newTempHp = combatant.tempHp || 0;
    if (amount < 0 && newTempHp > 0) {
      newTempHp += amount; // amount is negative
      if (newTempHp < 0) {
        newHp = combatant.currentHp + newTempHp; // Apply remaining damage to regular HP
        newTempHp = 0;
      } else {
        newHp = combatant.currentHp; // All damage absorbed
      }
      if (newHp < 0) newHp = 0;
    }

    await db.combatants.update(combatant.id, { currentHp: newHp, tempHp: newTempHp });
  };

  const handleManualHpSubmit = async (e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    
    setIsEditingHp(false);
    if (!hpInput) return;

    let newValue = parseInt(hpInput, 10);
    if (isNaN(newValue)) return;

    if (hpInput.startsWith('+') || hpInput.startsWith('-')) {
      await updateHp(newValue);
    } else {
      await db.combatants.update(combatant.id, { currentHp: Math.max(0, Math.min(newValue, combatant.maxHp)) });
    }
    setHpInput('');
  };

  const toggleCondition = async (conditionId: string) => {
    let newConditions = [...combatant.conditions];
    if (newConditions.includes(conditionId)) {
      newConditions = newConditions.filter(c => c !== conditionId);
    } else {
      newConditions.push(conditionId);
    }
    await db.combatants.update(combatant.id, { conditions: newConditions });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256, 256, 0.75);
      await db.combatants.update(combatant.id, { avatar: dataUrl });
    } catch (err) {
      console.error('Failed to resize image', err);
      alert('Ошибка при загрузке изображения.');
    }
  };

  const hpPercent = (combatant.currentHp / combatant.maxHp) * 100;
  let hpColor = 'bg-dm-success';
  if (hpPercent <= 50) hpColor = 'bg-dm-warning';
  if (hpPercent <= 20) hpColor = 'bg-dm-danger';

  return (
    <div className={`relative flex flex-col bg-dm-panelAlt border rounded-lg transition-all ${isActive ? 'border-dm-accent glow-active-turn' : 'border-dm-border hover:border-dm-borderLight'}`}>
      <div className="flex gap-3 p-3">
        {/* Avatar Area */}
        <div 
          className="relative w-16 h-16 rounded-md bg-dm-card border border-dm-border overflow-hidden shrink-0 group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {combatant.avatar ? (
            <img src={combatant.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dm-textMuted">
              <ImageIcon className="w-6 h-6 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
          
          <div className="absolute -bottom-2 -right-2 bg-dm-panel text-dm-text text-xs font-mono font-bold w-6 h-6 rounded-full border border-dm-border flex items-center justify-center shadow-lg">
            {combatant.initiative}
          </div>
        </div>

        {/* Info Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`font-bold text-base truncate ${combatant.type === 'player' ? 'text-dm-accent' : 'text-dm-danger'}`}>
                {combatant.name}
              </h3>
              <div className="flex gap-2 text-xs text-dm-textMuted mt-0.5">
                <span className="flex items-center gap-1" title="Класс Доспеха (AC)">
                  <Shield className="w-3 h-3" /> {combatant.ac}
                </span>
                <span className="flex items-center gap-1" title="Пассивное Внимание">
                  <Eye className="w-3 h-3" /> {combatant.passivePerception}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1">
              <button onClick={handleDuplicate} className="p-1 rounded text-dm-textMuted hover:text-dm-text hover:bg-dm-card" title="Дублировать">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} className="p-1 rounded text-dm-textMuted hover:text-dm-danger hover:bg-dm-card" title="Удалить">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* HP Bar and Controls */}
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <button onClick={() => updateHp(-10)} className="px-1.5 py-0.5 text-[10px] rounded bg-dm-danger/20 text-dm-danger hover:bg-dm-danger hover:text-white transition-colors">-10</button>
                <button onClick={() => updateHp(-5)} className="px-1.5 py-0.5 text-[10px] rounded bg-dm-danger/20 text-dm-danger hover:bg-dm-danger hover:text-white transition-colors">-5</button>
                <button onClick={() => updateHp(-1)} className="px-1.5 py-0.5 text-[10px] rounded bg-dm-danger/20 text-dm-danger hover:bg-dm-danger hover:text-white transition-colors">-1</button>
              </div>
              
              <div className="flex-1 text-center font-mono font-bold text-sm relative">
                {isEditingHp ? (
                  <input
                    type="text"
                    value={hpInput}
                    onChange={(e) => setHpInput(e.target.value)}
                    onBlur={handleManualHpSubmit}
                    onKeyDown={handleManualHpSubmit}
                    className="w-16 bg-dm-card border border-dm-accent rounded text-center text-dm-text focus:outline-none"
                    placeholder="e.g. -5, 20"
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setIsEditingHp(true)} className="cursor-pointer hover:underline text-dm-text">
                    {combatant.currentHp} / {combatant.maxHp}
                    {combatant.tempHp > 0 && <span className="text-sky-400 ml-1">(+{combatant.tempHp})</span>}
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                <button onClick={() => updateHp(1)} className="px-1.5 py-0.5 text-[10px] rounded bg-dm-success/20 text-dm-success hover:bg-dm-success hover:text-white transition-colors">+1</button>
                <button onClick={() => updateHp(5)} className="px-1.5 py-0.5 text-[10px] rounded bg-dm-success/20 text-dm-success hover:bg-dm-success hover:text-white transition-colors">+5</button>
              </div>
            </div>

            <div className="w-full h-1.5 bg-dm-card rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-300 ${hpColor}`} 
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
              {/* Temp HP visualization (blue overlay on top of normal HP) */}
              {combatant.tempHp > 0 && (
                <div 
                  className="absolute top-0 left-0 h-full bg-sky-400/50 transition-all duration-300"
                  style={{ width: `${Math.min(100, (combatant.tempHp / combatant.maxHp) * 100)}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conditions & Spells Bar */}
      <div className="px-3 pb-3 flex flex-wrap gap-1">
        <button 
          onClick={() => setShowConditions(!showConditions)}
          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${showConditions ? 'bg-dm-card border-dm-border text-dm-text' : 'bg-transparent border-dashed border-dm-borderLight text-dm-textMuted hover:border-dm-textMuted'}`}
        >
          + Состояние
        </button>
        
        {combatant.conditions.map(cId => {
          const c = DND_CONDITIONS.find(cond => cond.id === cId);
          if (!c) return null;
          return (
            <span key={c.id} onClick={() => toggleCondition(c.id)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer ${c.bgColor} ${c.color} ${c.borderColor} hover:opacity-80`}>
              {c.nameRu}
            </span>
          );
        })}

        {combatant.spellIds?.map(sId => (
          <span key={sId} onClick={() => onOpenSpell(sId)} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-dm-magic/20 text-dm-magic border border-dm-magic/30 cursor-pointer hover:bg-dm-magic/30">
            Заклинание
          </span>
        ))}
      </div>

      {/* Conditions Picker Dropdown */}
      {showConditions && (
        <div className="absolute top-full left-0 z-40 mt-1 w-full bg-dm-panel border border-dm-border rounded-lg shadow-xl p-2 grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
          {DND_CONDITIONS.map(c => {
            const isActive = combatant.conditions.includes(c.id);
            return (
              <div 
                key={c.id} 
                onClick={() => toggleCondition(c.id)}
                className={`px-2 py-1.5 rounded text-xs cursor-pointer border transition-colors flex items-center justify-between ${isActive ? `${c.bgColor} border-transparent ${c.color}` : 'bg-dm-bg border-dm-border text-dm-textMuted hover:border-dm-text'}`}
              >
                <span>{c.nameRu}</span>
                {isActive && <Eye className="w-3 h-3" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

