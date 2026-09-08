import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign } from '../../types';

import { DiceRollerDropdown } from '../DiceRoller/DiceRollerDropdown';
import {
  FolderKanban,
  Plus,
  Trash2,
  Download,
  Upload,
  Play,
  RotateCcw,
  Swords,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  currentCampaign: Campaign | null;
  onSelectCampaign: (campaign: Campaign) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCampaign,
  onSelectCampaign,
}) => {
  const [isCampaignDropdownOpen, setIsCampaignDropdownOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const campaigns = useLiveQuery(() => db.campaigns.toArray(), []) || [];

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    const newCamp: Campaign = {
      id: crypto.randomUUID(),
      name: newCampaignName.trim(),
      createdAt: Date.now(),
      currentRound: 0,
      activeCombatantId: null,
    };
    await db.campaigns.add(newCamp);
    onSelectCampaign(newCamp);
    setNewCampaignName('');
    setIsCreatingCampaign(false);
  };

  const handleDeleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (campaigns.length <= 1) {
      alert('Нельзя удалить единственную кампанию.');
      return;
    }
    if (confirm('Вы уверены, что хотите удалить эту кампанию и всех её бойцов?')) {
      await db.campaigns.delete(id);
      await db.combatants.where('campaignId').equals(id).delete();
      await db.encounters.where('campaignId').equals(id).delete();
      await db.sessionNotes.where('campaignId').equals(id).delete();
      const remaining = campaigns.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        onSelectCampaign(remaining[0]);
      }
    }
  };

  // Управление раундами (Защита от F5)
  const handleNextRound = async () => {
    if (!currentCampaign) return;
    const nextRound = (currentCampaign.currentRound || 0) + 1;
    await db.campaigns.update(currentCampaign.id, { currentRound: nextRound });
  };

  const handleResetRound = async () => {
    if (!currentCampaign) return;
    if (confirm('Сбросить счетчик раундов до 0?')) {
      await db.campaigns.update(currentCampaign.id, {
        currentRound: 0,
        activeCombatantId: null,
      });
    }
  };

  // Экспорт базы кампании в единый JSON
  const handleExportJson = async () => {
    if (!currentCampaign) return;
    const combatants = await db.combatants.where('campaignId').equals(currentCampaign.id).toArray();
    const encounters = await db.encounters.where('campaignId').equals(currentCampaign.id).toArray();
    const notes = await db.sessionNotes.where('campaignId').equals(currentCampaign.id).toArray();
    const customMonsters = await db.monsters.where('campaignId').equals(currentCampaign.id).toArray();

    const exportData = {
      version: 1,
      exportedAt: Date.now(),
      campaign: currentCampaign,
      combatants,
      encounters,
      notes,
      customMonsters,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dm-deck-${currentCampaign.name.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Импорт базы кампании из JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.campaign || !data.campaign.name) {
          alert('Неверный формат файла кампании.');
          return;
        }

        const newCampId = crypto.randomUUID();
        const importedCampaign: Campaign = {
          ...data.campaign,
          id: newCampId,
          name: `${data.campaign.name} (Импорт)`,
          createdAt: Date.now(),
        };

        await db.campaigns.add(importedCampaign);

        if (Array.isArray(data.combatants)) {
          const remappedCombatants = data.combatants.map((c: any) => ({
            ...c,
            id: crypto.randomUUID(),
            campaignId: newCampId,
          }));
          await db.combatants.bulkAdd(remappedCombatants);
        }

        if (Array.isArray(data.encounters)) {
          const remappedEncounters = data.encounters.map((enc: any) => ({
            ...enc,
            id: crypto.randomUUID(),
            campaignId: newCampId,
          }));
          await db.encounters.bulkAdd(remappedEncounters);
        }

        if (Array.isArray(data.notes)) {
          const remappedNotes = data.notes.map((n: any) => ({
            ...n,
            id: crypto.randomUUID(),
            campaignId: newCampId,
          }));
          await db.sessionNotes.bulkAdd(remappedNotes);
        }

        onSelectCampaign(importedCampaign);
        alert('Кампания успешно импортирована!');
      } catch (err) {
        console.error(err);
        alert('Ошибка при чтении JSON-файла.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="h-14 bg-dm-panel border-b border-dm-border flex items-center justify-between px-4 shrink-0 z-30 select-none">
      {/* Левая часть: Логотип и Выпадающий список кампаний */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-dm-text font-black tracking-wider text-base">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-dm-accent to-indigo-500 flex items-center justify-center text-white shadow-lg">
            <Swords className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            DM DECK
          </span>
        </div>

        {/* Campaign Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCampaignDropdownOpen(!isCampaignDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-dm-card hover:bg-dm-cardHover border border-dm-border text-xs sm:text-sm font-medium text-dm-text transition-colors max-w-xs truncate"
          >
            <FolderKanban className="w-4 h-4 text-dm-accent shrink-0" />
            <span className="truncate">{currentCampaign?.name || 'Выберите кампанию'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-dm-textMuted shrink-0 ml-1" />
          </button>

          {isCampaignDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-64 bg-dm-panel border border-dm-border rounded-lg shadow-2xl p-2 z-50 flex flex-col gap-1">
              <div className="text-[11px] font-semibold text-dm-textSubtle uppercase px-2 py-1">
                Кампании
              </div>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    onClick={() => {
                      onSelectCampaign(camp);
                      setIsCampaignDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      currentCampaign?.id === camp.id
                        ? 'bg-dm-accent/20 text-dm-accent font-semibold border border-dm-accent/30'
                        : 'text-dm-text hover:bg-dm-card'
                    }`}
                  >
                    <span className="truncate">{camp.name}</span>
                    <button
                      onClick={(e) => handleDeleteCampaign(camp.id, e)}
                      className="text-dm-textSubtle hover:text-dm-danger p-1 rounded"
                      title="Удалить кампанию"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {isCreatingCampaign ? (
                <div className="pt-2 border-t border-dm-border flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="Название кампании..."
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="px-2 py-1 rounded bg-dm-bg border border-dm-border text-xs text-dm-text focus:outline-none focus:border-dm-accent"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleCreateCampaign}
                      className="flex-1 py-1 rounded bg-dm-accent text-white text-xs font-semibold hover:bg-dm-accentHover"
                    >
                      Создать
                    </button>
                    <button
                      onClick={() => setIsCreatingCampaign(false)}
                      className="px-2 py-1 rounded bg-dm-card text-dm-textMuted text-xs hover:text-dm-text"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingCampaign(true)}
                  className="mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-dm-accent hover:bg-dm-accent/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Новая кампания</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Центральная часть: Счетчик раунда боя (Защита от F5) */}
      <div className="flex items-center gap-2 bg-dm-panelAlt px-3 py-1 rounded-lg border border-dm-border">
        <span className="text-xs text-dm-textMuted uppercase font-bold tracking-wider">
          Раунд
        </span>
        <span className="text-lg font-mono font-black text-dm-accent px-1">
          {currentCampaign?.currentRound || 0}
        </span>
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={handleNextRound}
            className="p-1 rounded bg-dm-card hover:bg-dm-cardHover text-dm-success hover:text-white transition-colors"
            title="Следующий раунд"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetRound}
            className="p-1 rounded bg-dm-card hover:bg-dm-cardHover text-dm-textMuted hover:text-dm-danger transition-colors"
            title="Сбросить раунд"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Правая часть: Бросок кубов, Экспорт/Импорт */}
      <div className="flex items-center gap-2">
        <DiceRollerDropdown />

        <div className="h-4 w-px bg-dm-border mx-1" />

        {/* Экспорт JSON */}
        <button
          onClick={handleExportJson}
          className="p-1.5 rounded-md bg-dm-card hover:bg-dm-cardHover border border-dm-border text-dm-textMuted hover:text-dm-text transition-colors"
          title="Экспорт базы кампании в JSON"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Импорт JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-md bg-dm-card hover:bg-dm-cardHover border border-dm-border text-dm-textMuted hover:text-dm-text transition-colors"
          title="Импорт кампании из JSON"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJson}
          className="hidden"
        />
      </div>
    </header>
  );
};

