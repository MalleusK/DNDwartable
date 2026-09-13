import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, User, Shield, Heart, Swords, Eye, Sparkles } from 'lucide-react';
import { parseLSSCharacter, createCombatantFromLSS, ParsedLSSResult } from '../../utils/lssParser';
import { db } from '../../db/db';

interface ImportLSSModalProps {
  campaignId: string;
  onClose: () => void;
  onImported?: () => void;
}

export const ImportLSSModal: React.FC<ImportLSSModalProps> = ({ campaignId, onClose, onImported }) => {
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ParsedLSSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customInit, setCustomInit] = useState<number | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tryParse = useCallback((text: string) => {
    setJsonText(text);
    setError(null);
    setParsed(null);
    if (!text.trim()) return;

    try {
      const result = parseLSSCharacter(text);
      setParsed(result);
      setCustomName(result.name);
      setCustomInit(result.initiativeBonus);
    } catch (e: any) {
      setError(e.message || 'Не удалось распарсить JSON');
    }
  }, []);

  const handleFileLoad = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      tryParse(text);
    };
    reader.onerror = () => setError('Ошибка чтения файла');
    reader.readAsText(file, 'utf-8');
  }, [tryParse]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFileLoad(file);
    } else {
      setError('Перетащите файл .json из Long Story Short');
    }
  }, [handleFileLoad]);

  const handleImport = async () => {
    if (!parsed) return;
    const finalParsed = { ...parsed, name: customName.trim() || parsed.name };
    const combatant = createCombatantFromLSS(
      finalParsed,
      campaignId,
      customInit !== '' ? Number(customInit) : undefined
    );
    await db.combatants.add(combatant);
    onImported?.();
    onClose();
  };

  const formatMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dm-border bg-dm-panelAlt shrink-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-dm-accent" />
            <h2 className="text-sm font-bold text-dm-text">Импорт из Long Story Short</h2>
          </div>
          <button onClick={onClose} className="text-dm-textMuted hover:text-dm-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-dm-accent bg-dm-accent/10'
                : 'border-dm-border hover:border-dm-accent/50 hover:bg-dm-card/50'
            }`}
          >
            <FileText className="w-8 h-8 mx-auto mb-2 text-dm-textMuted" />
            <p className="text-sm text-dm-textMuted">
              Перетащите <strong>.json</strong> файл из Long Story Short сюда
            </p>
            <p className="text-xs text-dm-textSubtle mt-1">или нажмите, чтобы выбрать файл</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileLoad(file);
              }}
            />
          </div>

          {/* Or paste JSON */}
          <div>
            <label className="block text-xs text-dm-textMuted mb-1 font-medium">
              Или вставьте JSON вручную:
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => tryParse(e.target.value)}
              placeholder='{"jsonType":"character","data":"{...}",...}'
              rows={4}
              className="w-full bg-dm-bg border border-dm-border rounded-md px-3 py-2 text-xs text-dm-text focus:outline-none focus:border-dm-accent resize-none font-mono"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div className="bg-dm-card border border-dm-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-dm-accent/10 border-b border-dm-border">
                <h3 className="text-sm font-bold text-dm-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-dm-accent" />
                  Предпросмотр персонажа
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {/* Editable name + class info */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] text-dm-textMuted mb-0.5 uppercase font-bold tracking-wider">Имя</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-dm-bg border border-dm-border rounded px-2 py-1.5 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-dm-textMuted mb-0.5 uppercase font-bold tracking-wider">Инициатива</label>
                    <input
                      type="number"
                      value={customInit}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setCustomInit(isNaN(v) ? '' : v);
                      }}
                      className="w-full bg-dm-bg border border-dm-border rounded px-2 py-1.5 text-sm text-dm-text focus:outline-none focus:border-dm-accent"
                      placeholder="d20+мод"
                    />
                  </div>
                </div>

                {/* Class / Race / BG line */}
                <div className="text-xs text-dm-textMuted">
                  <span className="text-dm-accent font-semibold">{parsed.className}</span>
                  {parsed.subclass && <span className="text-dm-textSubtle"> ({parsed.subclass})</span>}
                  {' '}{parsed.level} ур. • {parsed.race}
                  {parsed.subrace && <span className="text-dm-textSubtle"> ({parsed.subrace})</span>}
                  {parsed.background && <> • {parsed.background}</>}
                </div>

                {/* Core stats grid */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-dm-bg rounded-lg p-2 text-center border border-dm-border">
                    <Heart className="w-3.5 h-3.5 text-red-400 mx-auto mb-0.5" />
                    <div className="text-lg font-bold text-red-400">{parsed.maxHp}</div>
                    <div className="text-[10px] text-dm-textSubtle uppercase">ХП</div>
                  </div>
                  <div className="bg-dm-bg rounded-lg p-2 text-center border border-dm-border">
                    <Shield className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                    <div className="text-lg font-bold text-blue-400">{parsed.ac}</div>
                    <div className="text-[10px] text-dm-textSubtle uppercase">КД</div>
                  </div>
                  <div className="bg-dm-bg rounded-lg p-2 text-center border border-dm-border">
                    <Swords className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                    <div className="text-lg font-bold text-amber-400">+{parsed.initiativeBonus}</div>
                    <div className="text-[10px] text-dm-textSubtle uppercase">Иниц.</div>
                  </div>
                  <div className="bg-dm-bg rounded-lg p-2 text-center border border-dm-border">
                    <Eye className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                    <div className="text-lg font-bold text-emerald-400">{parsed.passivePerception}</div>
                    <div className="text-[10px] text-dm-textSubtle uppercase">Вним.</div>
                  </div>
                </div>

                {/* Ability scores */}
                <div className="grid grid-cols-6 gap-1.5">
                  {Object.entries(parsed.stats).map(([key, val]) => {
                    const labels: Record<string, string> = { str: 'СИЛ', dex: 'ЛОВ', con: 'ТЕЛ', int: 'ИНТ', wis: 'МУД', cha: 'ХАР' };
                    return (
                      <div key={key} className="bg-dm-bg rounded text-center py-1.5 border border-dm-border">
                        <div className="text-[9px] text-dm-textSubtle font-bold uppercase">{labels[key] || key}</div>
                        <div className="text-sm font-bold text-dm-text">{val}</div>
                        <div className="text-[10px] text-dm-textMuted">{formatMod(val)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Saves, Skills, Speed */}
                <div className="space-y-1 text-xs text-dm-textMuted">
                  {parsed.saves.length > 0 && (
                    <p><span className="text-dm-textSubtle font-medium">Спасброски:</span> {parsed.saves.join(', ')}</p>
                  )}
                  {parsed.skills.length > 0 && (
                    <p><span className="text-dm-textSubtle font-medium">Навыки:</span> {parsed.skills.join(', ')}</p>
                  )}
                  <p><span className="text-dm-textSubtle font-medium">Скорость:</span> {parsed.speed} фт. • <span className="text-dm-textSubtle font-medium">Мастерство:</span> +{parsed.proficiencyBonus}</p>
                </div>

                {/* Actions */}
                {parsed.actions.length > 0 && (
                  <div>
                    <p className="text-[10px] text-dm-textSubtle font-bold uppercase mb-1">Действия / Ресурсы</p>
                    <div className="space-y-1">
                      {parsed.actions.map((a, i) => (
                        <div key={i} className="text-xs bg-dm-bg rounded px-2 py-1 border border-dm-border">
                          <span className="font-medium text-dm-text">{a.name}</span>
                          <span className="text-dm-textMuted ml-1.5">— {a.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Traits */}
                {parsed.traits.length > 0 && (
                  <div>
                    <p className="text-[10px] text-dm-textSubtle font-bold uppercase mb-1">Черты и умения</p>
                    <div className="space-y-1">
                      {parsed.traits.map((t, i) => (
                        <div key={i} className="text-xs bg-dm-bg rounded px-2 py-1 border border-dm-border">
                          <span className="font-medium text-dm-text">{t.name}</span>
                          {t.desc && <p className="text-dm-textMuted mt-0.5 text-[11px] line-clamp-2">{t.desc}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dm-border bg-dm-panelAlt flex items-center justify-between shrink-0">
          <p className="text-[10px] text-dm-textSubtle">
            {parsed ? '✅ Персонаж распознан и готов к импорту' : 'Загрузите или вставьте JSON из Long Story Short'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-dm-card text-dm-textMuted hover:text-dm-text text-sm font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleImport}
              disabled={!parsed}
              className="px-4 py-2 rounded-md bg-dm-accent text-white hover:bg-dm-accentHover disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Добавить в бой
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
