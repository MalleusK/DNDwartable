import React, { useState } from 'react';
import { Spell } from '../../types';

import { X, BookOpen, Clock, Shield, Activity } from 'lucide-react';

interface SpellModalProps {
  spell: Spell;
  onClose: () => void;
  onAttachToCombatant?: () => void;
}

export const SpellModal: React.FC<SpellModalProps> = ({ spell, onClose, onAttachToCombatant }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-dm-border bg-dm-panelAlt">
          <div>
            <h2 className="text-xl font-bold text-dm-magic">{spell.nameRu}</h2>
            <div className="text-sm text-dm-textMuted italic">{spell.nameEn}</div>
            <div className="text-xs text-dm-textSubtle mt-1 font-medium">
              {spell.level === 0 ? 'Заговор' : `${spell.level} круг`}, {spell.school.toLowerCase()}
            </div>
          </div>
          <button onClick={onClose} className="text-dm-textMuted hover:text-dm-text p-1 bg-dm-bg rounded-md border border-transparent hover:border-dm-border">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 text-sm text-dm-text">
          <div className="grid grid-cols-2 gap-4 mb-6">
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

          <div className="prose prose-sm prose-invert max-w-none">
            <p className="leading-relaxed whitespace-pre-wrap">{spell.description}</p>
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

        {onAttachToCombatant && (
          <div className="p-4 border-t border-dm-border bg-dm-panelAlt flex justify-end">
            <button
              onClick={onAttachToCombatant}
              className="px-4 py-2 rounded-md bg-dm-magic text-white hover:bg-dm-magic/80 text-sm font-medium transition-colors shadow-lg shadow-dm-magic/20"
            >
              Привязать к бойцу
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

