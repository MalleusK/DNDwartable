import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign, Combatant, Monster } from '../../types';

import { Search, Filter, Shield, Activity, Plus } from 'lucide-react';
import { rollD20 } from '../../utils/dice';

interface BestiaryProps {
  currentCampaign: Campaign | null;
}

export const Bestiary: React.FC<BestiaryProps> = ({ currentCampaign }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCr, setSelectedCr] = useState<string>('all');
  const [expandedMonsterId, setExpandedMonsterId] = useState<string | null>(null);

  const monsters = useLiveQuery(() => db.monsters.toArray(), []) || [];

  const filteredMonsters = monsters.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCr = selectedCr === 'all' ? true : m.cr === selectedCr;
    return matchesSearch && matchesCr;
  });

  const allCrs = Array.from(new Set(monsters.map(m => m.cr))).sort((a, b) => {
    const parseCr = (cr: string) => {
      if (cr.includes('/')) {
        const [num, den] = cr.split('/');
        return parseInt(num) / parseInt(den);
      }
      return parseInt(cr);
    };
    return parseCr(a) - parseCr(b);
  });

  const handleAddToCombat = async (monster: Monster, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCampaign) {
      alert('Сначала выберите или создайте кампанию!');
      return;
    }

    // Авто-нумерация: проверяем сколько уже таких монстров в бою
    const existingInCombat = await db.combatants
      .where('campaignId').equals(currentCampaign.id)
      .filter(c => c.name.startsWith(monster.name))
      .toArray();
      
    let finalName = monster.name;
    if (existingInCombat.length > 0) {
      finalName = `${monster.name} ${existingInCombat.length + 1}`;
    }

    const init = rollD20(Math.floor((monster.stats.dex - 10) / 2)).total;

    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      campaignId: currentCampaign.id,
      name: finalName,
      type: 'monster',
      maxHp: monster.hp,
      currentHp: monster.hp,
      tempHp: 0,
      ac: monster.ac,
      passivePerception: 10 + Math.floor((monster.stats.wis - 10) / 2),
      initiative: init,
      conditions: [],
      spellIds: monster.spells || [],
    };

    await db.combatants.add(newCombatant);
  };

  const calculateMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="flex flex-col h-full bg-dm-bg rounded-lg border border-dm-border overflow-hidden">
      <div className="p-4 bg-dm-panel border-b border-dm-border flex flex-col gap-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-textMuted" />
          <input
            type="text"
            placeholder="Поиск монстра..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dm-bg border border-dm-border rounded-lg pl-9 pr-4 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-danger transition-colors placeholder:text-dm-textSubtle"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <Filter className="w-4 h-4 text-dm-textMuted shrink-0" />
          <button
            onClick={() => setSelectedCr('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedCr === 'all' ? 'bg-dm-danger/20 text-dm-danger border-dm-danger/30' : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'}`}
          >
            Все (CR)
          </button>
          {allCrs.map(cr => (
            <button
              key={cr}
              onClick={() => setSelectedCr(cr)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedCr === cr ? 'bg-dm-danger/20 text-dm-danger border-dm-danger/30' : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'}`}
            >
              CR {cr}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex flex-col gap-3">
          {filteredMonsters.map(monster => {
            const isExpanded = expandedMonsterId === monster.id;
            return (
              <div 
                key={monster.id}
                className="bg-dm-card border border-dm-border hover:border-dm-danger/50 rounded-lg overflow-hidden transition-colors flex flex-col"
              >
                {/* Заголовок карточки */}
                <div 
                  onClick={() => setExpandedMonsterId(isExpanded ? null : monster.id)}
                  className="p-3 cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex flex-col">
                    <h4 className="font-bold text-dm-text group-hover:text-dm-danger transition-colors text-base">{monster.name}</h4>
                    <div className="text-xs text-dm-textMuted">Опасность (CR): {monster.cr}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleAddToCombat(monster, e)}
                      className="flex items-center gap-1 bg-dm-danger hover:bg-dm-dangerHover text-white px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-lg shadow-dm-danger/20"
                      title="Добавить в активный бой"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      В бой
                    </button>
                  </div>
                </div>

                {/* Раскрывающийся статблок */}
                {isExpanded && (
                  <div className="p-4 bg-dm-panelAlt border-t border-dm-border text-sm flex flex-col gap-4">
                    
                    <div className="flex gap-6 text-dm-text">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-dm-accent" />
                        <span className="font-semibold text-dm-textMuted text-xs">КД</span>
                        <span className="font-bold">{monster.ac}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-dm-success" />
                        <span className="font-semibold text-dm-textMuted text-xs">ХП</span>
                        <span className="font-bold">{monster.hp}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-dm-textMuted text-xs">Скорость</span>
                        <span className="font-medium text-dm-text">{monster.speed}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 gap-2 bg-dm-bg p-3 rounded-lg border border-dm-border text-center">
                      {[
                        { label: 'СИЛ', val: monster.stats.str },
                        { label: 'ЛОВ', val: monster.stats.dex },
                        { label: 'ТЕЛ', val: monster.stats.con },
                        { label: 'ИНТ', val: monster.stats.int },
                        { label: 'МУД', val: monster.stats.wis },
                        { label: 'ХАР', val: monster.stats.cha }
                      ].map(stat => (
                        <div key={stat.label} className="flex flex-col">
                          <span className="text-[10px] text-dm-textMuted font-bold">{stat.label}</span>
                          <span className="font-bold text-dm-text">{stat.val}</span>
                          <span className="text-[10px] text-dm-textSubtle">{calculateMod(stat.val)}</span>
                        </div>
                      ))}
                    </div>

                    {monster.traits && monster.traits.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {monster.traits.map(t => (
                          <div key={t.name}>
                            <span className="font-bold text-dm-text text-sm italic">{t.name}. </span>
                            <span className="text-dm-text text-sm">{t.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {monster.actions && monster.actions.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="text-xs font-bold text-dm-danger uppercase tracking-wider mb-1 border-b border-dm-border pb-1">Действия</div>
                        {monster.actions.map(a => (
                          <div key={a.name}>
                            <span className="font-bold text-dm-text text-sm italic">{a.name}. </span>
                            <span className="text-dm-text text-sm">{a.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

