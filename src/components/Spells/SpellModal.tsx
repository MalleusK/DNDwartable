import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Spell } from '../../types';
import { db } from '../../db/db';
import { X, BookOpen, Clock, Shield, Activity, Sparkles, Check, ChevronDown } from 'lucide-react';

interface SpellModalProps {
  spell: Spell;
  onClose: () => void;
  onAttachToCombatant?: (combatantId: string) => void;
}

export const SpellModal: React.FC<SpellModalProps> = ({ spell, onClose }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [attachedSuccessName, setAttachedSuccessName] = useState<string | null>(null);

  const activeCampaignId = localStorage.getItem('dm_active_campaign');
  const combatants = useLiveQuery(
    () => activeCampaignId ? db.combatants.where('campaignId').equals(activeCampaignId).toArray() : [],
    [activeCampaignId]
  ) || [];

  const handleAttach = async (combatantId: string, name: string) => {
    const combatant = await db.combatants.get(combatantId);
    if (!combatant) return;

    const currentSpells = combatant.spellIds || [];
    if (!currentSpells.includes(spell.id)) {
      await db.combatants.update(combatantId, {
        spellIds: [...currentSpells, spell.id],
      });
    }

    setAttachedSuccessName(name);
    setTimeout(() => {
      setAttachedSuccessName(null);
      setShowPicker(false);
    }, 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transition-transform"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={onClose}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-dm-border bg-dm-panelAlt">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-dm-magic" />
              <h2 className="text-xl font-bold text-dm-magic">{spell.nameRu}</h2>
            </div>
            <div className="text-sm text-dm-textMuted italic">{spell.nameEn}</div>
            <div className="text-xs text-dm-textSubtle mt-1 font-medium">
              {spell.level === 0 ? 'Заговор' : `${spell.level} круг`}, {spell.school.toLowerCase()}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-dm-textMuted hover:text-dm-text p-1 bg-dm-bg rounded-md border border-transparent hover:border-dm-border transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm text-dm-text custom-scrollbar">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="flex items-start gap-2 bg-dm-bg p-3 rounded-lg border border-dm-border">
              <Clock className="w-4 h-4 text-dm-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-dm-textMuted font-semibold">Время каста</div>
                <div>{spell.castingTime}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-dm-bg p-3 rounded-lg border border-dm-border">
              <Activity className="w-4 h-4 text-dm-success shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-dm-textMuted font-semibold">Дистанция</div>
                <div>{spell.range}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-dm-bg p-3 rounded-lg border border-dm-border">
              <BookOpen className="w-4 h-4 text-dm-warning shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-dm-textMuted font-semibold">Компоненты</div>
                <div>{spell.components}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-dm-bg p-3 rounded-lg border border-dm-border">
              <Shield className="w-4 h-4 text-dm-danger shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-dm-textMuted font-semibold">Длительность</div>
                <div>{spell.duration}</div>
              </div>
            </div>
          </div>

          <div className="prose prose-sm prose-invert max-w-none text-dm-text leading-relaxed">
            <p className="whitespace-pre-wrap">{spell.description}</p>
          </div>

          {spell.classes && spell.classes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-dm-border">
              <div className="text-xs text-dm-textMuted mb-2 font-semibold">Классы</div>
              <div className="flex flex-wrap gap-2">
                {spell.classes.map(c => (
                  <span key={c} className="px-2 py-1 rounded bg-dm-card border border-dm-border text-xs text-dm-text">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Attach to Combatant Action */}
        <div className="p-4 border-t border-dm-border bg-dm-panelAlt flex items-center justify-between relative">
          <div>
            {attachedSuccessName && (
              <span className="text-xs text-dm-success font-semibold flex items-center gap-1 animate-fadeIn">
                <Check className="w-4 h-4" /> Заклинание привязано к {attachedSuccessName}!
              </span>
            )}
          </div>

          {combatants.length > 0 ? (
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-dm-magic text-white hover:bg-dm-magic/80 text-sm font-medium transition-colors shadow-lg shadow-dm-magic/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Привязать к бойцу...</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showPicker && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-dm-panel border border-dm-border rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 z-50 max-h-48 overflow-y-auto custom-scrollbar animate-fadeIn">
                  <div className="px-2 py-1 text-[11px] text-dm-textMuted font-semibold border-b border-dm-border">
                    Выберите бойца:
                  </div>
                  {combatants.map(c => {
                    const isAlreadyAttached = c.spellIds?.includes(spell.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleAttach(c.id, c.name)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left transition-colors ${
                          isAlreadyAttached 
                            ? 'bg-dm-magic/10 text-dm-magic font-medium' 
                            : 'hover:bg-dm-card text-dm-text'
                        }`}
                      >
                        <span className="truncate">{c.name} ({c.type === 'player' ? 'Игрок' : 'Монстр'})</span>
                        {isAlreadyAttached && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-dm-textSubtle">
              (В активном бою нет бойцов для привязки)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
