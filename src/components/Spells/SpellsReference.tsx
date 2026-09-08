import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Spell } from '../../types';

import { SpellModal } from './SpellModal';
import { Search, Filter, BookOpen } from 'lucide-react';

export const SpellsReference: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  const spells = useLiveQuery(() => db.spells.toArray(), []) || [];

  const filteredSpells = spells.filter(spell => {
    const matchesSearch = spell.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          spell.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' ? true : spell.level.toString() === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  // Группировка по кругам магии для отображения
  const groupedSpells = filteredSpells.reduce((acc, spell) => {
    const levelStr = spell.level === 0 ? 'Заговоры' : `${spell.level} круг`;
    if (!acc[levelStr]) acc[levelStr] = [];
    acc[levelStr].push(spell);
    return acc;
  }, {} as Record<string, Spell[]>);

  // Сортировка ключей (Заговоры, 1 круг, 2 круг...)
  const sortedLevels = Object.keys(groupedSpells).sort((a, b) => {
    if (a === 'Заговоры') return -1;
    if (b === 'Заговоры') return 1;
    return parseInt(a) - parseInt(b);
  });

  return (
    <div className="flex flex-col h-full bg-dm-bg rounded-lg border border-dm-border overflow-hidden">
      <div className="p-4 bg-dm-panel border-b border-dm-border flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-textMuted" />
          <input
            type="text"
            placeholder="Поиск заклинания (рус/англ)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dm-bg border border-dm-border rounded-lg pl-9 pr-4 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-magic transition-colors placeholder:text-dm-textSubtle"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <Filter className="w-4 h-4 text-dm-textMuted shrink-0" />
          <button
            onClick={() => setSelectedLevel('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedLevel === 'all' ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/30' : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'}`}
          >
            Все круги
          </button>
          <button
            onClick={() => setSelectedLevel('0')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedLevel === '0' ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/30' : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'}`}
          >
            Заговоры
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level.toString())}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedLevel === level.toString() ? 'bg-dm-magic/20 text-dm-magic border-dm-magic/30' : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'}`}
            >
              {level} круг
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {sortedLevels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-dm-textMuted gap-2">
            <BookOpen className="w-8 h-8 opacity-20" />
            <span className="text-sm">Заклинания не найдены</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedLevels.map(levelStr => (
              <div key={levelStr}>
                <div className="text-xs font-bold text-dm-textSubtle uppercase tracking-wider mb-2 sticky top-0 bg-dm-bg py-1 z-10">
                  {levelStr}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {groupedSpells[levelStr].sort((a,b) => a.nameRu.localeCompare(b.nameRu)).map(spell => (
                    <div 
                      key={spell.id}
                      onClick={() => setSelectedSpell(spell)}
                      className="bg-dm-card border border-dm-border hover:border-dm-magic/50 rounded-lg p-3 cursor-pointer transition-colors group flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-dm-text group-hover:text-dm-magic transition-colors text-sm">{spell.nameRu}</h4>
                        <span className="text-[10px] text-dm-textSubtle px-1.5 py-0.5 rounded border border-dm-borderLight bg-dm-panel">{spell.school}</span>
                      </div>
                      <div className="text-xs text-dm-textMuted italic">{spell.nameEn}</div>
                      <div className="text-xs text-dm-textSubtle mt-1 line-clamp-2 leading-relaxed">
                        {spell.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSpell && (
        <SpellModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />
      )}
    </div>
  );
};

