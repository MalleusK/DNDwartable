import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Combatant, CombatantType } from '../../types';

import { db } from '../../db/db';
import { rollD20 } from '../../utils/dice';

interface AddCombatantModalProps {
  campaignId: string;
  onClose: () => void;
}

export const AddCombatantModal: React.FC<AddCombatantModalProps> = ({ campaignId, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CombatantType>('monster');
  const [hp, setHp] = useState<number | ''>('');
  const [ac, setAc] = useState<number | ''>('');
  const [initiative, setInitiative] = useState<number | ''>('');
  
  const handleSave = async () => {
    if (!name.trim()) return;

    const finalHp = Number(hp) || 10;
    const finalAc = Number(ac) || 10;
    const finalInit = initiative !== '' ? Number(initiative) : rollD20().total;

    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      campaignId,
      name: name.trim(),
      type,
      maxHp: finalHp,
      currentHp: finalHp,
      tempHp: 0,
      ac: finalAc,
      passivePerception: 10,
      initiative: finalInit,
      conditions: [],
      spellIds: [],
    };

    await db.combatants.add(newCombatant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-[400px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dm-border bg-dm-panelAlt">
          <h2 className="text-sm font-bold text-dm-text">Быстрое добавление бойца</h2>
          <button onClick={onClose} className="text-dm-textMuted hover:text-dm-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-dm-textMuted mb-1">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
              placeholder="Имя бойца..."
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={type === 'monster'} 
                onChange={() => setType('monster')}
                className="accent-dm-accent"
              />
              <span className="text-sm text-dm-text">Монстр / NPC</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={type === 'player'} 
                onChange={() => setType('player')}
                className="accent-dm-accent"
              />
              <span className="text-sm text-dm-text">Игрок</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-dm-textMuted mb-1">Макс. ХП</label>
              <input
                type="number"
                value={hp}
                onChange={(e) => setHp(parseInt(e.target.value) || '')}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-xs text-dm-textMuted mb-1">КД (AC)</label>
              <input
                type="number"
                value={ac}
                onChange={(e) => setAc(parseInt(e.target.value) || '')}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-xs text-dm-textMuted mb-1">Инициатива</label>
              <input
                type="number"
                value={initiative}
                onChange={(e) => setInitiative(parseInt(e.target.value))}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="Авто (d20)"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-dm-border bg-dm-panelAlt flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-dm-card text-dm-textMuted hover:text-dm-text text-sm font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-md bg-dm-accent text-white hover:bg-dm-accentHover disabled:opacity-50 text-sm font-medium transition-colors"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
};

