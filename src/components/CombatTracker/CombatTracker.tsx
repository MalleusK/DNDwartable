import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign } from '../../types';

import { CombatantCard } from './CombatantCard';
import { AddCombatantModal } from './AddCombatantModal';
import { SortDesc, UserPlus, Play } from 'lucide-react';

interface CombatTrackerProps {
  currentCampaign: Campaign | null;
  onOpenSpell: (spellId: string) => void;
}

export const CombatTracker: React.FC<CombatTrackerProps> = ({ currentCampaign, onOpenSpell }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const combatants = useLiveQuery(
    () => currentCampaign ? db.combatants.where('campaignId').equals(currentCampaign.id).toArray() : [],
    [currentCampaign?.id]
  );

  if (!currentCampaign) {
    return <div className="p-4 text-dm-textMuted text-sm">Выберите или создайте кампанию для начала боя.</div>;
  }

  // Сортировка по убыванию инициативы
  const sortedCombatants = [...(combatants || [])].sort((a, b) => b.initiative - a.initiative);

  const handleNextTurn = async () => {
    if (sortedCombatants.length === 0) return;

    const currentIndex = sortedCombatants.findIndex(c => c.id === currentCampaign.activeCombatantId);
    let nextIndex = currentIndex + 1;

    // Если текущего бойца нет или мы дошли до конца списка — переходим к первому и увеличиваем раунд
    if (currentIndex === -1 || nextIndex >= sortedCombatants.length) {
      nextIndex = 0;
      await db.campaigns.update(currentCampaign.id, { 
        currentRound: (currentCampaign.currentRound || 0) + 1,
        activeCombatantId: sortedCombatants[nextIndex].id
      });
    } else {
      await db.campaigns.update(currentCampaign.id, { 
        activeCombatantId: sortedCombatants[nextIndex].id
      });
    }
  };

  const handleSortInitiative = async () => {
    // Эта функция может быть полезна, если вы хотите перебросить инициативу всем, но пока оставим как просто сортировку (которая и так происходит автоматически при рендере)
    // Либо можно сбросить activeCombatantId на первого в списке
    if (sortedCombatants.length > 0) {
      await db.campaigns.update(currentCampaign.id, { activeCombatantId: sortedCombatants[0].id });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 relative">
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex-1 flex items-center justify-center gap-2 bg-dm-panel border border-dm-border hover:border-dm-accent hover:text-dm-accent rounded-lg py-2 text-sm font-medium transition-colors text-dm-text"
        >
          <UserPlus className="w-4 h-4" />
          Добавить бойца
        </button>
        <button 
          onClick={handleNextTurn}
          className="flex-1 flex items-center justify-center gap-2 bg-dm-accent hover:bg-dm-accentHover text-white rounded-lg py-2 text-sm font-medium transition-colors shadow-lg shadow-dm-accent/20"
        >
          <Play className="w-4 h-4" />
          Следующий ход
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-dm-textMuted uppercase font-bold tracking-wider px-1">
        <span>Очередь Инициативы</span>
        <button onClick={handleSortInitiative} className="hover:text-dm-text flex items-center gap-1" title="Сбросить ход на начало списка">
          <SortDesc className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-20">
        {sortedCombatants.length === 0 ? (
          <div className="text-center text-dm-textSubtle text-sm py-8 border-2 border-dashed border-dm-border rounded-lg">
            Нет бойцов в текущей кампании. <br/>Добавьте вручную или загрузите из планировщика.
          </div>
        ) : (
          sortedCombatants.map(combatant => (
            <CombatantCard
              key={combatant.id}
              combatant={combatant}
              isActive={currentCampaign.activeCombatantId === combatant.id}
              onOpenSpell={onOpenSpell}
            />
          ))
        )}
      </div>

      {showAddModal && (
        <AddCombatantModal 
          campaignId={currentCampaign.id} 
          onClose={() => setShowAddModal(false)} 
        />
      )}
    </div>
  );
};

