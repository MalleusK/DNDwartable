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
  const [notes, setNotes] = useState('');
  
  const handleSave = async () => {
    if (!name.trim()) return;

    const finalHp = Math.max(1, Number(hp) || 10);
    const finalAc = Math.max(0, Number(ac) || 10);
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
      notes: notes.trim() || undefined,
    };

    await db.combatants.add(newCombatant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dm-border bg-dm-panelAlt">
          <h2 className="text-sm font-bold text-dm-text">Быстрое добавление бойца</h2>
          <button onClick={onClose} className="text-dm-textMuted hover:text-dm-text">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-dm-textMuted mb-1 font-medium">Имя бойца</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
              placeholder="напр. Гоблин-вожак, Лира..."
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={type === 'monster'} 
                onChange={() => setType('monster')}
                className="accent-dm-danger"
              />
              <span className="text-sm text-dm-text">Монстр / Враг</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                checked={type === 'player'} 
                onChange={() => setType('player')}
                className="accent-dm-accent"
              />
              <span className="text-sm text-dm-text">Игрок / Союзник</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-dm-textMuted mb-1 font-medium">Макс. ХП</label>
              <input
                type="number"
                min="1"
                value={hp}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setHp(isNaN(val) ? '' : Math.max(1, val));
                }}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-xs text-dm-textMuted mb-1 font-medium">КД (AC)</label>
              <input
                type="number"
                min="0"
                value={ac}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setAc(isNaN(val) ? '' : Math.max(0, val));
                }}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-xs text-dm-textMuted mb-1 font-medium">Инициатива</label>
              <input
                type="number"
                value={initiative}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setInitiative(isNaN(val) ? '' : val);
                }}
                className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                placeholder="Авто (d20)"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-dm-textMuted mb-1 font-medium">
              Заметки мастера <span className="text-[10px] text-dm-textSubtle">(необязательно)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Спасброски, слабости, концентрация, особенности..."
              rows={2}
              className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-1.5 text-xs text-dm-text focus:outline-none focus:border-dm-accent resize-none"
            />
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
