import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Spell, Combatant } from '../../types';
import { X, Search, Plus, Check, Sparkles } from 'lucide-react';

interface AttachSpellModalProps {
  combatant: Combatant;
  onClose: () => void;
  onOpenSpellDetails?: (spellId: string) => void;
}

export const AttachSpellModal: React.FC<AttachSpellModalProps> = ({ 
  combatant, 
  onClose,
  onOpenSpellDetails 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const spells = useLiveQuery(() => db.spells.toArray(), []) || [];

  const attachedSet = new Set(combatant.spellIds || []);

  const filteredSpells = spells.filter(spell => {
    const matchesSearch = 
      spell.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) || 
      spell.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' ? true : spell.level.toString() === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const toggleAttach = async (spell: Spell) => {
    const current = combatant.spellIds || [];
    let updated: string[];
    if (current.includes(spell.id)) {
      updated = current.filter(id => id !== spell.id);
    } else {
      updated = [...current, spell.id];
    }
    await db.combatants.update(combatant.id, { spellIds: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dm-border bg-dm-panelAlt">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-dm-magic" />
            <div>
              <h2 className="text-sm font-bold text-dm-text">
                Заклинания для: <span className="text-dm-magic">{combatant.name}</span>
              </h2>
              <p className="text-[11px] text-dm-textMuted">
                Привязанных заклинаний: {attachedSet.size}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-dm-textMuted hover:text-dm-text p-1 rounded-md hover:bg-dm-bg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Level Filters */}
        <div className="p-3 bg-dm-bg border-b border-dm-border flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-textMuted" />
            <input
              type="text"
              placeholder="Поиск по названию заклинания (рус / англ)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dm-panel border border-dm-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-dm-text focus:outline-none focus:border-dm-magic transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                selectedLevel === 'all' 
                  ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/40 font-semibold' 
                  : 'bg-dm-card text-dm-textMuted border-transparent hover:text-dm-text'
              }`}
            >
              Все круги
            </button>
            <button
              onClick={() => setSelectedLevel('0')}
              className={`px-2.5 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                selectedLevel === '0' 
                  ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/40 font-semibold' 
                  : 'bg-dm-card text-dm-textMuted border-transparent hover:text-dm-text'
              }`}
            >
              Заговоры
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl.toString())}
                className={`px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
                  selectedLevel === lvl.toString() 
                    ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/40 font-semibold' 
                    : 'bg-dm-card text-dm-textMuted border-transparent hover:text-dm-text'
                }`}
              >
                {lvl} круг
              </button>
            ))}
          </div>
        </div>

        {/* Spells List */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
          {filteredSpells.length === 0 ? (
            <div className="text-center text-dm-textMuted text-xs py-8">
              Заклинания не найдены.
            </div>
          ) : (
            filteredSpells.map(spell => {
              const isAttached = attachedSet.has(spell.id);
              const levelLabel = spell.level === 0 ? 'Заговор' : `${spell.level} круг`;

              return (
                <div
                  key={spell.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    isAttached 
                      ? 'bg-dm-magic/10 border-dm-magic/40' 
                      : 'bg-dm-card border-dm-border hover:border-dm-borderLight'
                  }`}
                >
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onOpenSpellDetails && onOpenSpellDetails(spell.id)}
                    title="Нажмите для описания"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-dm-text hover:text-dm-magic">
                        {spell.nameRu}
                      </span>
                      <span className="text-[10px] text-dm-textMuted italic">
                        ({spell.nameEn})
                      </span>
                    </div>
                    <div className="text-[10px] text-dm-textMuted flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.2 bg-dm-panel rounded text-[9px] border border-dm-border">
                        {levelLabel}
                      </span>
                      <span>{spell.school}</span>
                      <span>•</span>
                      <span>{spell.castingTime}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAttach(spell)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isAttached
                        ? 'bg-dm-magic text-white hover:bg-dm-magic/80'
                        : 'bg-dm-panel border border-dm-border text-dm-text hover:border-dm-magic hover:text-dm-magic'
                    }`}
                  >
                    {isAttached ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Привязано</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Привязать</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dm-border bg-dm-panelAlt flex justify-between items-center text-xs">
          <span className="text-dm-textMuted">
            Нажмите на название, чтобы прочесть описание заклинания
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-dm-accent hover:bg-dm-accentHover text-white rounded-md font-medium transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
