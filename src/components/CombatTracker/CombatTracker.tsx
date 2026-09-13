import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign } from '../../types';

import { CombatantCard } from './CombatantCard';
import { CombatantCompactRow } from './CombatantCompactRow';
import { AddCombatantModal } from './AddCombatantModal';
import { ImportLSSModal } from './ImportLSSModal';
import { InitiativeRibbon } from './InitiativeRibbon';
import {
  SortDesc, UserPlus, Play, Upload, Search, Target,
  LayoutList, LayoutGrid, Users, Skull, List
} from 'lucide-react';

interface CombatTrackerProps {
  currentCampaign: Campaign | null;
  onOpenSpell: (spellId: string) => void;
}

type ViewMode = 'detailed' | 'compact';
type FilterMode = 'all' | 'players' | 'monsters';

export const CombatTracker: React.FC<CombatTrackerProps> = ({ currentCampaign, onOpenSpell }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportLSS, setShowImportLSS] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem('dm_combat_view') as ViewMode) || 'detailed'
  );
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCompactId, setExpandedCompactId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const combatants = useLiveQuery(
    () => currentCampaign ? db.combatants.where('campaignId').equals(currentCampaign.id).toArray() : [],
    [currentCampaign?.id]
  );

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('dm_combat_view', viewMode);
  }, [viewMode]);

  // Sort by initiative descending
  const sortedCombatants = [...(combatants || [])].sort((a, b) => b.initiative - a.initiative);

  // Apply filters and search
  const filteredCombatants = sortedCombatants.filter(c => {
    if (filterMode === 'players' && c.type !== 'player') return false;
    if (filterMode === 'monsters' && c.type !== 'monster') return false;
    if (searchQuery.trim()) {
      return c.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  // Scroll to a specific combatant
  const scrollToCombatant = useCallback((id: string) => {
    const el = cardRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.classList.add('ring-2', 'ring-dm-accent', 'ring-offset-1', 'ring-offset-dm-bg');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-dm-accent', 'ring-offset-1', 'ring-offset-dm-bg');
      }, 1200);
    }
  }, []);

  const handleNextTurn = async () => {
    if (sortedCombatants.length === 0 || !currentCampaign) return;

    const currentIndex = sortedCombatants.findIndex(c => c.id === currentCampaign.activeCombatantId);
    let nextIndex = currentIndex + 1;

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

    // Auto-scroll to the new active combatant after state settles
    setTimeout(() => scrollToCombatant(sortedCombatants[nextIndex].id), 150);
  };

  const handleSortInitiative = async () => {
    if (sortedCombatants.length > 0 && currentCampaign) {
      await db.campaigns.update(currentCampaign.id, { activeCombatantId: sortedCombatants[0].id });
    }
  };

  const scrollToActive = () => {
    if (currentCampaign?.activeCombatantId) {
      scrollToCombatant(currentCampaign.activeCombatantId);
    }
  };

  // Register card ref callback
  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

  if (!currentCampaign) {
    return <div className="p-4 text-dm-textMuted text-sm">Выберите или создайте кампанию для начала боя.</div>;
  }

  const playerCount = sortedCombatants.filter(c => c.type === 'player').length;
  const monsterCount = sortedCombatants.filter(c => c.type === 'monster').length;

  return (
    <div className="flex flex-col h-full gap-2 relative">
      {/* Action buttons row */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-1.5 bg-dm-panel border border-dm-border hover:border-dm-accent hover:text-dm-accent rounded-lg py-2 px-3 text-xs font-medium transition-colors text-dm-text"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Добавить
        </button>
        <button
          onClick={() => setShowImportLSS(true)}
          className="flex items-center justify-center gap-1.5 bg-dm-panel border border-dm-border hover:border-purple-400 hover:text-purple-400 rounded-lg py-2 px-3 text-xs font-medium transition-colors text-dm-text"
          title="Импорт персонажа из Long Story Short"
        >
          <Upload className="w-3.5 h-3.5" />
          LSS
        </button>
        <button
          onClick={handleNextTurn}
          className="flex-1 flex items-center justify-center gap-2 bg-dm-accent hover:bg-dm-accentHover text-white rounded-lg py-2 text-sm font-medium transition-colors shadow-lg shadow-dm-accent/20"
        >
          <Play className="w-4 h-4" />
          Следующий ход
        </button>
      </div>

      {/* Initiative Ribbon */}
      <InitiativeRibbon
        combatants={sortedCombatants}
        activeCombatantId={currentCampaign.activeCombatantId}
        currentRound={currentCampaign.currentRound}
        onScrollTo={scrollToCombatant}
      />

      {/* Controls row: search, filters, view mode, focus */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-dm-textSubtle absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-dm-bg border border-dm-border rounded-md pl-7 pr-2 py-1.5 text-xs text-dm-text focus:outline-none focus:border-dm-accent"
          />
        </div>

        {/* Filter badges */}
        <div className="flex gap-0.5 shrink-0">
          {([
            { mode: 'all' as FilterMode, label: 'Все', icon: List, count: sortedCombatants.length },
            { mode: 'players' as FilterMode, label: 'ИГ', icon: Users, count: playerCount },
            { mode: 'monsters' as FilterMode, label: 'ВР', icon: Skull, count: monsterCount },
          ]).map(f => (
            <button
              key={f.mode}
              onClick={() => setFilterMode(f.mode)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                filterMode === f.mode
                  ? 'bg-dm-accent/20 text-dm-accent border border-dm-accent/40'
                  : 'bg-dm-bg text-dm-textMuted border border-dm-border hover:border-dm-accent/30'
              }`}
              title={f.label}
            >
              <f.icon className="w-3 h-3" />
              <span>{f.count}</span>
            </button>
          ))}
        </div>

        {/* View mode toggle */}
        <div className="flex gap-0.5 shrink-0 bg-dm-bg border border-dm-border rounded-md p-0.5">
          <button
            onClick={() => setViewMode('detailed')}
            className={`p-1 rounded ${viewMode === 'detailed' ? 'bg-dm-accent/20 text-dm-accent' : 'text-dm-textMuted hover:text-dm-text'}`}
            title="Подробный вид"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-1 rounded ${viewMode === 'compact' ? 'bg-dm-accent/20 text-dm-accent' : 'text-dm-textMuted hover:text-dm-text'}`}
            title="Компактный вид"
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Focus on active */}
        {currentCampaign.activeCombatantId && (
          <button
            onClick={scrollToActive}
            className="flex items-center gap-1 px-2 py-1 bg-dm-accent/10 text-dm-accent border border-dm-accent/30 rounded-md text-[10px] font-medium hover:bg-dm-accent/20 transition-colors shrink-0"
            title="Прокрутить к текущему ходу"
          >
            <Target className="w-3 h-3" />
            К ходу
          </button>
        )}

        {/* Sort reset */}
        <button
          onClick={handleSortInitiative}
          className="p-1.5 text-dm-textMuted hover:text-dm-text shrink-0"
          title="Сбросить ход на начало"
        >
          <SortDesc className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Combatant List — scrollable */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
        <div className={`flex flex-col ${viewMode === 'compact' ? 'gap-1' : 'gap-3'} pb-4`}>
          {filteredCombatants.length === 0 ? (
            <div className="text-center text-dm-textSubtle text-sm py-8 border-2 border-dashed border-dm-border rounded-lg">
              {sortedCombatants.length === 0
                ? <>Нет бойцов в текущей кампании. <br />Добавьте вручную или загрузите из планировщика.</>
                : 'Нет бойцов по текущему фильтру.'
              }
            </div>
          ) : (
            filteredCombatants.map(combatant => (
              <div
                key={combatant.id}
                ref={(el) => setCardRef(combatant.id, el)}
                className="transition-all"
              >
                {viewMode === 'compact' && expandedCompactId !== combatant.id ? (
                  <CombatantCompactRow
                    combatant={combatant}
                    isActive={currentCampaign.activeCombatantId === combatant.id}
                    onExpand={() => setExpandedCompactId(combatant.id)}
                  />
                ) : (
                  <CombatantCard
                    combatant={combatant}
                    isActive={currentCampaign.activeCombatantId === combatant.id}
                    onOpenSpell={onOpenSpell}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCombatantModal
          campaignId={currentCampaign.id}
          onClose={() => setShowAddModal(false)}
          onOpenLSS={() => { setShowAddModal(false); setShowImportLSS(true); }}
        />
      )}

      {showImportLSS && (
        <ImportLSSModal
          campaignId={currentCampaign.id}
          onClose={() => setShowImportLSS(false)}
        />
      )}
    </div>
  );
};
