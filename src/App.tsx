import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';

import { SplitView } from './components/SplitView/SplitView';
import { Header } from './components/Header/Header';
import { CombatTracker } from './components/CombatTracker/CombatTracker';
import { EncounterPlanner } from './components/EncounterPlanner/EncounterPlanner';
import { SpellsReference } from './components/Spells/SpellsReference';
import { Bestiary } from './components/Bestiary/Bestiary';
import { SessionNotes } from './components/Notes/SessionNotes';
import { SpellModal } from './components/Spells/SpellModal';

function App() {
  const [activeLeftTab, setActiveLeftTab] = useState<'combat' | 'planner'>('combat');
  const [activeRightTab, setActiveRightTab] = useState<'spells' | 'bestiary' | 'notes'>('spells');
  
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    return localStorage.getItem('dm_active_campaign');
  });

  const [openedSpellId, setOpenedSpellId] = useState<string | null>(null);

  const campaigns = useLiveQuery(() => db.campaigns.toArray(), []) || [];
  const allSpells = useLiveQuery(() => db.spells.toArray(), []) || [];

  const currentCampaign = campaigns.find((c: any) => c.id === currentCampaignId) || (campaigns.length > 0 ? campaigns[0] : null);

  useEffect(() => {
    if (currentCampaign) {
      localStorage.setItem('dm_active_campaign', currentCampaign.id);
      if (currentCampaignId !== currentCampaign.id) {
        setCurrentCampaignId(currentCampaign.id);
      }
    }
  }, [currentCampaign, currentCampaignId]);

  const handleOpenSpell = useCallback((spellId: string) => {
    setOpenedSpellId(spellId);
  }, []);

  const openedSpell = allSpells.find(s => s.id === openedSpellId);

  return (
    <div className="flex flex-col h-screen bg-dm-bg text-dm-text font-sans">
      <Header 
        currentCampaign={currentCampaign} 
        onSelectCampaign={(c) => setCurrentCampaignId(c.id)} 
      />

      {/* Main Content Area using SplitView */}
      <div className="flex-1 overflow-hidden">
        <SplitView>
          {/* Left Panel */}
          <div className="h-full flex flex-col bg-dm-bg">
            <div className="flex border-b border-dm-border shrink-0">
              <button 
                onClick={() => setActiveLeftTab('combat')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${activeLeftTab === 'combat' ? 'border-dm-accent text-dm-text' : 'border-transparent text-dm-textMuted hover:text-dm-text'}`}
              >
                Активный бой
              </button>
              <button 
                onClick={() => setActiveLeftTab('planner')}
                className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${activeLeftTab === 'planner' ? 'border-dm-accent text-dm-text' : 'border-transparent text-dm-textMuted hover:text-dm-text'}`}
              >
                Планировщик
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {activeLeftTab === 'combat' ? (
                <CombatTracker currentCampaign={currentCampaign} onOpenSpell={handleOpenSpell} />
              ) : (
                <EncounterPlanner currentCampaign={currentCampaign} />
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="h-full flex flex-col bg-dm-panelAlt">
            <div className="flex border-b border-dm-border shrink-0 px-2 pt-2 gap-1">
              <button 
                onClick={() => setActiveRightTab('spells')}
                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeRightTab === 'spells' ? 'bg-dm-card text-dm-text' : 'bg-transparent text-dm-textMuted hover:bg-dm-border/50'}`}
              >
                Заклинания
              </button>
              <button 
                onClick={() => setActiveRightTab('bestiary')}
                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeRightTab === 'bestiary' ? 'bg-dm-card text-dm-text' : 'bg-transparent text-dm-textMuted hover:bg-dm-border/50'}`}
              >
                Бестиарий
              </button>
              <button 
                onClick={() => setActiveRightTab('notes')}
                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeRightTab === 'notes' ? 'bg-dm-card text-dm-text' : 'bg-transparent text-dm-textMuted hover:bg-dm-border/50'}`}
              >
                Блокнот
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-dm-card p-4">
              {activeRightTab === 'spells' && <SpellsReference />}
              {activeRightTab === 'bestiary' && <Bestiary currentCampaign={currentCampaign} />}
              {activeRightTab === 'notes' && <SessionNotes currentCampaign={currentCampaign} />}
            </div>
          </div>
        </SplitView>
      </div>

      {/* Global Modals */}
      {openedSpell && (
        <SpellModal spell={openedSpell} onClose={() => setOpenedSpellId(null)} />
      )}
    </div>
  );
}

export default App;

