import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign, Combatant, Encounter, EncounterMonsterConfig } from '../../types';

import { Plus, Trash2, Play, Users, X } from 'lucide-react';
import { rollD20 } from '../../utils/dice';

interface EncounterPlannerProps {
  currentCampaign: Campaign | null;
  onLaunchEncounter?: () => void;
}

export const EncounterPlanner: React.FC<EncounterPlannerProps> = ({ currentCampaign, onLaunchEncounter }) => {
  const [newEncounterName, setNewEncounterName] = useState('');
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  const encounters = useLiveQuery(
    () => currentCampaign ? db.encounters.where('campaignId').equals(currentCampaign.id).toArray() : [],
    [currentCampaign?.id]
  );

  const allMonsters = useLiveQuery(() => db.monsters.toArray(), []) || [];

  if (!currentCampaign) {
    return <div className="p-4 text-dm-textMuted text-sm">Выберите кампанию для планирования.</div>;
  }

  const handleCreateEncounter = async () => {
    if (!newEncounterName.trim()) return;
    const newEncounter: Encounter = {
      id: crypto.randomUUID(),
      campaignId: currentCampaign.id,
      name: newEncounterName.trim(),
      status: 'planned',
      combatantsData: []
    };
    await db.encounters.add(newEncounter);
    setNewEncounterName('');
    setSelectedEncounterId(newEncounter.id);
  };

  const handleDeleteEncounter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить эту заготовку?')) {
      await db.encounters.delete(id);
      if (selectedEncounterId === id) setSelectedEncounterId(null);
    }
  };

  const handleAddMonsterToEncounter = async (encounter: Encounter, monsterId: string) => {
    const monster = allMonsters.find(m => m.id === monsterId);
    if (!monster) return;

    const newConfig: EncounterMonsterConfig = {
      monsterId: monster.id,
      name: monster.name,
      count: 1
    };

    const existingIndex = encounter.combatantsData.findIndex(c => c.monsterId === monsterId);
    let updatedData = [...encounter.combatantsData];
    
    if (existingIndex >= 0) {
      updatedData[existingIndex].count += 1;
    } else {
      updatedData.push(newConfig);
    }

    await db.encounters.update(encounter.id, { combatantsData: updatedData });
  };

  const handleRemoveMonsterFromEncounter = async (encounter: Encounter, monsterId: string) => {
    const updatedData = encounter.combatantsData.filter(c => c.monsterId !== monsterId);
    await db.encounters.update(encounter.id, { combatantsData: updatedData });
  };

  const handleUpdateMonsterCount = async (encounter: Encounter, monsterId: string, delta: number) => {
    const updatedData = encounter.combatantsData.map(c => {
      if (c.monsterId === monsterId) {
        return { ...c, count: Math.max(1, c.count + delta) };
      }
      return c;
    });
    await db.encounters.update(encounter.id, { combatantsData: updatedData });
  };

  const handleLaunchEncounter = async (encounter: Encounter) => {
    if (confirm(`Запустить бой "${encounter.name}"? Это добавит всех монстров в текущую очередь инициативы.`)) {
      const newCombatants: Combatant[] = [];
      
      // Сначала получим текущих бойцов, чтобы авто-нумеровать правильно с учетом уже существующих
      const currentCombatants = await db.combatants.where('campaignId').equals(currentCampaign.id).toArray();
      const nameCounts: Record<string, number> = {};
      
      // Подсчитываем сколько уже есть каждого имени
      currentCombatants.forEach(c => {
        const baseNameMatch = c.name.match(/^(.*?)( \d+)?$/);
        const baseName = baseNameMatch ? baseNameMatch[1] : c.name;
        nameCounts[baseName] = (nameCounts[baseName] || 0) + 1;
      });

      for (const config of encounter.combatantsData) {
        const monster = allMonsters.find(m => m.id === config.monsterId);
        if (!monster) continue;

        let baseNameCount = nameCounts[monster.name] || 0;

        for (let i = 0; i < config.count; i++) {
          baseNameCount++;
          const finalName = config.count === 1 && baseNameCount === 1 ? monster.name : `${monster.name} ${baseNameCount}`;
          
          const init = config.customInit !== undefined ? config.customInit : rollD20(Math.floor((monster.stats.dex - 10) / 2)).total;
          
          newCombatants.push({
            id: crypto.randomUUID(),
            campaignId: currentCampaign.id,
            name: finalName,
            type: 'monster',
            maxHp: config.customHp || monster.hp,
            currentHp: config.customHp || monster.hp,
            tempHp: 0,
            ac: monster.ac,
            passivePerception: 10 + Math.floor((monster.stats.wis - 10) / 2),
            initiative: init,
            conditions: [],
            spellIds: monster.spells || [],
            monsterId: monster.id,
            stats: monster.stats,
            actions: monster.actions,
            traits: monster.traits,
          });
        }
        nameCounts[monster.name] = baseNameCount;
      }

      await db.combatants.bulkAdd(newCombatants);
      if (onLaunchEncounter) {
        onLaunchEncounter();
      }
    }
  };

  const selectedEncounter = encounters?.find(e => e.id === selectedEncounterId);

  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* Форма создания */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Название нового боя (напр. 'Засада в лесу')"
          value={newEncounterName}
          onChange={(e) => setNewEncounterName(e.target.value)}
          className="flex-1 bg-dm-panel border border-dm-border rounded-lg px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateEncounter()}
        />
        <button 
          onClick={handleCreateEncounter}
          className="bg-dm-accent hover:bg-dm-accentHover text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center shadow-lg shadow-dm-accent/20"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Список заготовок */}
        <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
          {encounters?.length === 0 && (
             <div className="text-dm-textMuted text-xs text-center py-4">Нет заготовок</div>
          )}
          {encounters?.map(enc => (
            <div 
              key={enc.id}
              onClick={() => setSelectedEncounterId(enc.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-start ${
                selectedEncounterId === enc.id 
                  ? 'bg-dm-card border-dm-accent' 
                  : 'bg-dm-panel border-dm-border hover:border-dm-textMuted'
              }`}
            >
              <div className="flex flex-col gap-1">
                <span className={`font-semibold text-sm ${selectedEncounterId === enc.id ? 'text-dm-accent' : 'text-dm-text'}`}>{enc.name}</span>
                <span className="text-[10px] text-dm-textMuted flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {enc.combatantsData.reduce((sum, c) => sum + c.count, 0)} существ
                </span>
              </div>
              <button 
                onClick={(e) => handleDeleteEncounter(enc.id, e)}
                className="text-dm-textSubtle hover:text-dm-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Редактор выбранной заготовки */}
        <div className="flex-1 bg-dm-panel border border-dm-border rounded-lg flex flex-col overflow-hidden">
          {selectedEncounter ? (
            <>
              <div className="p-3 border-b border-dm-border flex justify-between items-center bg-dm-panelAlt">
                <h3 className="font-bold text-dm-text text-sm">{selectedEncounter.name}</h3>
                <button
                  onClick={() => handleLaunchEncounter(selectedEncounter)}
                  disabled={selectedEncounter.combatantsData.length === 0}
                  className="flex items-center gap-1.5 bg-dm-danger hover:bg-dm-dangerHover disabled:opacity-50 disabled:hover:bg-dm-danger text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-lg shadow-dm-danger/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  Запустить бой
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                
                <div className="mb-4">
                  <label className="block text-xs text-dm-textMuted font-bold mb-2 uppercase tracking-wider">Существа в сценарии</label>
                  {selectedEncounter.combatantsData.length === 0 ? (
                    <div className="text-dm-textSubtle text-xs border border-dashed border-dm-border rounded p-4 text-center">
                      Добавьте монстров из списка ниже.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedEncounter.combatantsData.map(c => (
                        <div key={c.monsterId} className="flex items-center justify-between bg-dm-card border border-dm-border rounded-md px-3 py-2">
                          <span className="text-sm text-dm-text font-medium">{c.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center bg-dm-bg rounded border border-dm-border">
                              <button onClick={() => handleUpdateMonsterCount(selectedEncounter, c.monsterId, -1)} className="px-2 hover:text-dm-accent">-</button>
                              <span className="text-xs font-mono font-bold px-2">{c.count}</span>
                              <button onClick={() => handleUpdateMonsterCount(selectedEncounter, c.monsterId, 1)} className="px-2 hover:text-dm-accent">+</button>
                            </div>
                            <button onClick={() => handleRemoveMonsterFromEncounter(selectedEncounter, c.monsterId)} className="text-dm-textSubtle hover:text-dm-danger">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-dm-textMuted font-bold mb-2 uppercase tracking-wider">Добавить из бестиария</label>
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar border border-dm-border rounded p-1">
                    {allMonsters.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-1.5 hover:bg-dm-card rounded text-xs cursor-pointer group" onClick={() => handleAddMonsterToEncounter(selectedEncounter, m.id)}>
                        <span className="text-dm-text group-hover:text-dm-accent transition-colors">{m.name} <span className="text-dm-textSubtle">(CR {m.cr})</span></span>
                        <Plus className="w-3.5 h-3.5 text-dm-textMuted group-hover:text-dm-accent opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-dm-textMuted text-sm">
              Выберите заготовку слева.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

