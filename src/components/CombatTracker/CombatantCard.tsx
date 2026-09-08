import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Combatant } from '../../types';
import { db } from '../../db/db';
import { DND_CONDITIONS } from '../../data/conditions';
import { 
  Shield, Eye, Trash2, Copy, Plus, Image as ImageIcon, 
  FileText, Sparkles, X, Heart, Skull, ShieldAlert,
  Dices, Swords, Edit3, Hash
} from 'lucide-react';
import { resizeImage } from '../../utils/imageResize';
import { 
  executeRollAndLog, extractAttackBonus, extractDamageFormula, 
  calculateModifier, formatModifier 
} from '../../utils/dice';
import { AttachSpellModal } from '../Spells/AttachSpellModal';
import { MarkdownViewer } from '../Common/MarkdownViewer';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  onOpenSpell: (spellId: string) => void;
}

export const CombatantCard: React.FC<CombatantCardProps> = ({ combatant, isActive, onOpenSpell }) => {
  const [hpInput, setHpInput] = useState('');
  const [isEditingHp, setIsEditingHp] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(combatant.notes || '');
  const [showActions, setShowActions] = useState(false);
  const [showDamagePalette, setShowDamagePalette] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showTempHpInput, setShowTempHpInput] = useState(false);
  const [tempHpInputVal, setTempHpInputVal] = useState('');
  const [customDiceFormula, setCustomDiceFormula] = useState('');
  const [quickCalcValue, setQuickCalcValue] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load attached spell details
  const attachedSpells = useLiveQuery(
    () => (combatant.spellIds && combatant.spellIds.length > 0)
      ? db.spells.where('id').anyOf(combatant.spellIds).toArray()
      : [],
    [combatant.spellIds]
  ) || [];

  // Safe inline delete without blocking browser window.confirm
  const handleDelete = async () => {
    try {
      const camp = await db.campaigns.get(combatant.campaignId);
      if (camp && camp.activeCombatantId === combatant.id) {
        await db.campaigns.update(combatant.campaignId, { activeCombatantId: null });
      }
      await db.combatants.delete(combatant.id);
    } catch (err) {
      console.error('Failed to delete combatant', err);
    }
  };

  const handleDuplicate = async () => {
    const newCombatant: Combatant = {
      ...combatant,
      id: crypto.randomUUID(),
      name: `${combatant.name} (Копия)`,
    };
    await db.combatants.add(newCombatant);
  };

  // Strictly non-negative HP update
  const updateHp = async (amount: number) => {
    let current = Math.max(0, combatant.currentHp);
    let temp = Math.max(0, combatant.tempHp || 0);

    if (amount < 0) {
      // Dealing damage
      const damage = Math.abs(amount);
      if (temp > 0) {
        if (damage <= temp) {
          temp -= damage;
        } else {
          const leftoverDamage = damage - temp;
          temp = 0;
          current = Math.max(0, current - leftoverDamage);
        }
      } else {
        current = Math.max(0, current - damage);
      }
    } else {
      // Healing
      current = Math.min(combatant.maxHp, current + amount);
    }

    await db.combatants.update(combatant.id, {
      currentHp: Math.max(0, current),
      tempHp: Math.max(0, temp),
    });
  };

  const handleManualHpSubmit = async (e: React.KeyboardEvent | React.FocusEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    
    setIsEditingHp(false);
    if (!hpInput.trim()) return;

    const trimmed = hpInput.trim();
    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) {
      setHpInput('');
      return;
    }

    if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
      await updateHp(parsed);
    } else {
      const clamped = Math.max(0, Math.min(parsed, combatant.maxHp));
      await db.combatants.update(combatant.id, { currentHp: clamped });
    }
    setHpInput('');
  };

  const handleAddTempHp = async () => {
    const val = parseInt(tempHpInputVal, 10);
    if (!isNaN(val) && val >= 0) {
      await db.combatants.update(combatant.id, { tempHp: val });
    }
    setTempHpInputVal('');
    setShowTempHpInput(false);
  };

  const toggleCondition = async (conditionId: string) => {
    let newConditions = [...(combatant.conditions || [])];
    if (newConditions.includes(conditionId)) {
      newConditions = newConditions.filter(c => c !== conditionId);
    } else {
      newConditions.push(conditionId);
    }
    await db.combatants.update(combatant.id, { conditions: newConditions });
  };

  const handleRemoveSpell = async (spellId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = (combatant.spellIds || []).filter(id => id !== spellId);
    await db.combatants.update(combatant.id, { spellIds: updated });
  };

  const handleNotesSave = async () => {
    await db.combatants.update(combatant.id, { notes: notesText });
    setIsEditingNotes(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256, 256, 0.75);
      await db.combatants.update(combatant.id, { avatar: dataUrl });
    } catch (err) {
      console.error('Failed to resize image', err);
      alert('Ошибка при загрузке изображения.');
    }
  };

  // Dice roll handlers for this combatant
  const handleRollStat = async (statLabel: string, score: number) => {
    const mod = calculateModifier(score);
    await executeRollAndLog(`1d20${mod >= 0 ? '+' : ''}${mod}`, `[${combatant.name}] Проверка ${statLabel}`);
  };

  const handleRollActionAttack = async (actionName: string, bonus: number) => {
    await executeRollAndLog(`1d20${bonus >= 0 ? '+' : ''}${bonus}`, `[${combatant.name}] ${actionName} (Атака)`);
  };

  const handleRollActionDamage = async (actionName: string, formula: string) => {
    await executeRollAndLog(formula, `[${combatant.name}] ${actionName} (Урон)`);
  };

  const handleCustomDiceRoll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customDiceFormula.trim()) return;
    try {
      await executeRollAndLog(customDiceFormula.trim(), `[${combatant.name}] Бросок`);
      setCustomDiceFormula('');
    } catch (err: any) {
      alert(err.message || 'Ошибка в формуле кубов');
    }
  };

  const handleQuickDice = async (sides: number) => {
    await executeRollAndLog(`1d${sides}`, `[${combatant.name}] d${sides}`);
  };

  const handleApplyQuickCalc = (isDamage: boolean) => {
    const val = parseInt(quickCalcValue, 10);
    if (isNaN(val) || val <= 0) return;
    updateHp(isDamage ? -val : val);
    setQuickCalcValue('');
  };

  const isDeadOrUnconscious = combatant.currentHp <= 0;
  const hpPercent = combatant.maxHp > 0 ? (combatant.currentHp / combatant.maxHp) * 100 : 0;
  
  let hpColor = 'bg-dm-success';
  if (hpPercent <= 50) hpColor = 'bg-dm-warning';
  if (hpPercent <= 20) hpColor = 'bg-dm-danger';

  const hasNotes = Boolean(combatant.notes && combatant.notes.trim().length > 0);
  const hasActions = Boolean(combatant.actions && combatant.actions.length > 0);
  const hasStats = Boolean(combatant.stats);

  // Extended damage & healing palettes
  const quickDamageButtons = [-1, -2, -3, -4, -5, -6, -8, -10, -15, -20];
  const quickHealButtons = [1, 2, 3, 5, 10, 20];
  const allDamagePills = [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -14, -15, -16, -18, -20, -25, -30, -35, -40, -50, -100];
  const allHealPills = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50];

  return (
    <div 
      className={`relative flex flex-col bg-dm-panelAlt border rounded-lg transition-all ${
        isActive 
          ? 'border-dm-accent ring-2 ring-dm-accent/30 glow-active-turn' 
          : 'border-dm-border hover:border-dm-borderLight'
      } ${isDeadOrUnconscious ? 'opacity-80' : ''}`}
    >
      <div className="flex gap-3 p-3">
        {/* Avatar Area */}
        <div 
          className="relative w-16 h-16 rounded-md bg-dm-card border border-dm-border overflow-hidden shrink-0 group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          title="Нажмите, чтобы изменить аватар"
        >
          {combatant.avatar ? (
            <img src={combatant.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dm-textMuted">
              <ImageIcon className="w-6 h-6 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
          
          <div 
            className="absolute -bottom-1 -right-1 bg-dm-panel text-dm-text text-xs font-mono font-bold w-6 h-6 rounded-full border border-dm-border flex items-center justify-center shadow-lg"
            title={`Инициатива: ${combatant.initiative}`}
          >
            {combatant.initiative}
          </div>
        </div>

        {/* Info Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold text-base truncate ${combatant.type === 'player' ? 'text-dm-accent' : 'text-dm-danger'}`}>
                  {combatant.name}
                </h3>
                {isDeadOrUnconscious && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-dm-danger/20 text-dm-danger border border-dm-danger/40 uppercase animate-pulse">
                    <Skull className="w-3 h-3" />
                    {combatant.type === 'player' ? 'При смерти' : 'Мёртв'}
                  </span>
                )}
              </div>

              <div className="flex gap-3 text-xs text-dm-textMuted mt-0.5">
                <span className="flex items-center gap-1" title="Класс Доспеха (AC)">
                  <Shield className="w-3.5 h-3.5 text-dm-text" /> 
                  <strong className="text-dm-text font-mono">{combatant.ac}</strong>
                </span>
                <span className="flex items-center gap-1" title="Пассивное Внимание">
                  <Eye className="w-3.5 h-3.5 text-dm-text" /> 
                  <strong className="text-dm-text font-mono">{combatant.passivePerception}</strong>
                </span>
              </div>
            </div>
            
            {/* Actions: Attacks, Notes, Duplicate, Delete */}
            <div className="flex items-center gap-1">
              {/* Attacks & Dice button */}
              <button 
                onClick={() => setShowActions(!showActions)} 
                className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${
                  showActions 
                    ? 'bg-dm-danger text-white' 
                    : hasActions 
                      ? 'text-dm-danger hover:bg-dm-card border border-dm-danger/30' 
                      : 'text-dm-textMuted hover:text-dm-text hover:bg-dm-card'
                }`} 
                title="Атаки, действия и броски кубов за этого бойца"
              >
                <Swords className="w-3.5 h-3.5" />
                {hasActions && (
                  <span className="text-[10px] font-bold font-mono">{combatant.actions?.length}</span>
                )}
              </button>

              {/* Notes button */}
              <button 
                onClick={() => {
                  setShowNotes(!showNotes);
                  if (!showNotes && !combatant.notes) setIsEditingNotes(true);
                }} 
                className={`p-1 rounded transition-colors relative ${
                  showNotes 
                    ? 'bg-dm-accent text-white' 
                    : hasNotes 
                      ? 'text-dm-accent hover:bg-dm-card' 
                      : 'text-dm-textMuted hover:text-dm-text hover:bg-dm-card'
                }`} 
                title={hasNotes ? "Заметки (есть записи)" : "Заметки бойца (Markdown)"}
              >
                <FileText className="w-3.5 h-3.5" />
                {hasNotes && !showNotes && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-dm-accent rounded-full" />
                )}
              </button>

              <button 
                onClick={handleDuplicate} 
                className="p-1 rounded text-dm-textMuted hover:text-dm-text hover:bg-dm-card transition-colors" 
                title="Дублировать бойца"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Inline Delete Confirmation */}
              {isConfirmingDelete ? (
                <div className="flex items-center gap-1 bg-dm-danger/20 border border-dm-danger/40 rounded px-1.5 py-0.5 animate-fadeIn">
                  <span className="text-[10px] text-dm-danger font-medium">Удалить?</span>
                  <button 
                    onClick={handleDelete} 
                    className="text-[10px] bg-dm-danger text-white px-1.5 py-0.5 rounded font-bold hover:bg-dm-dangerHover transition-colors"
                  >
                    Да
                  </button>
                  <button 
                    onClick={() => setIsConfirmingDelete(false)} 
                    className="text-[10px] text-dm-textMuted hover:text-dm-text px-1"
                  >
                    Нет
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsConfirmingDelete(true)} 
                  className="p-1 rounded text-dm-textMuted hover:text-dm-danger hover:bg-dm-card transition-colors" 
                  title="Удалить бойца"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* HP Bar and Controls */}
          <div className="mt-2.5 flex flex-col gap-1.5">
            {/* Quick Damage / HP Display / Quick Heal */}
            <div className="flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap">
              {/* Damage numbers row */}
              <div className="flex gap-0.5 flex-wrap items-center" title="Быстрый урон">
                {quickDamageButtons.map(amt => (
                  <button 
                    key={amt}
                    onClick={() => updateHp(amt)} 
                    className="px-1 py-0.5 text-[10px] font-mono font-bold rounded bg-dm-danger/20 text-dm-danger hover:bg-dm-danger hover:text-white transition-colors"
                  >
                    {amt}
                  </button>
                ))}
                <button
                  onClick={() => setShowDamagePalette(!showDamagePalette)}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                    showDamagePalette 
                      ? 'bg-dm-danger text-white border-dm-danger' 
                      : 'bg-dm-card text-dm-textMuted border-dm-border hover:border-dm-danger hover:text-dm-danger'
                  }`}
                  title="Открыть расширенную палитру всех чисел урона и лечения"
                >
                  <Hash className="w-3 h-3 inline" />
                </button>
              </div>
              
              {/* Center HP Input & Display */}
              <div className="text-center font-mono font-bold text-sm px-1 shrink-0">
                {isEditingHp ? (
                  <input
                    type="text"
                    value={hpInput}
                    onChange={(e) => setHpInput(e.target.value)}
                    onBlur={handleManualHpSubmit}
                    onKeyDown={handleManualHpSubmit}
                    className="w-16 bg-dm-card border border-dm-accent rounded text-center text-dm-text text-xs py-0.5 focus:outline-none"
                    placeholder="-5, +10"
                    autoFocus
                  />
                ) : (
                  <div 
                    onClick={() => setIsEditingHp(true)} 
                    className="cursor-pointer hover:underline text-dm-text flex items-center justify-center gap-1"
                    title="Нажмите, чтобы ввести урон (-5) или исцеление (+10)"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isDeadOrUnconscious ? 'text-dm-danger' : 'text-dm-success'}`} />
                    <span>{combatant.currentHp}</span>
                    <span className="text-dm-textMuted text-xs">/</span>
                    <span className="text-dm-textMuted text-xs">{combatant.maxHp}</span>
                    {combatant.tempHp > 0 && (
                      <span className="text-sky-400 text-xs font-semibold" title={`Временные хиты (ТХП): ${combatant.tempHp}`}>
                        (+{combatant.tempHp})
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Heal numbers & Temp HP */}
              <div className="flex gap-0.5 flex-wrap items-center justify-end" title="Быстрое исцеление">
                {quickHealButtons.map(amt => (
                  <button 
                    key={amt}
                    onClick={() => updateHp(amt)} 
                    className="px-1 py-0.5 text-[10px] font-mono font-bold rounded bg-dm-success/20 text-dm-success hover:bg-dm-success hover:text-white transition-colors"
                  >
                    +{amt}
                  </button>
                ))}
                <button 
                  onClick={() => setShowTempHpInput(!showTempHpInput)}
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
                  title="Установить Временные хиты (Temp HP)"
                >
                  ТХП
                </button>
              </div>
            </div>

            {/* Extended High-Density Damage & Healing Palette (When toggled) */}
            {showDamagePalette && (
              <div className="p-2 bg-dm-bg rounded-lg border border-dm-border flex flex-col gap-2 animate-fadeIn text-xs">
                {/* All damage pills */}
                <div>
                  <div className="text-[10px] font-bold text-dm-danger mb-1 flex items-center justify-between">
                    <span>УРОН (быстрый клик):</span>
                    <span className="text-[9px] text-dm-textMuted">нажмите для мгновенного урона</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allDamagePills.map(amt => (
                      <button
                        key={amt}
                        onClick={() => updateHp(amt)}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-dm-danger/15 text-dm-danger hover:bg-dm-danger hover:text-white border border-dm-danger/30 transition-colors"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All heal pills */}
                <div>
                  <div className="text-[10px] font-bold text-dm-success mb-1 flex items-center justify-between">
                    <span>ИСЦЕЛЕНИЕ:</span>
                    <span className="text-[9px] text-dm-textMuted">нажмите для лечения</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {allHealPills.map(amt => (
                      <button
                        key={amt}
                        onClick={() => updateHp(amt)}
                        className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-dm-success/15 text-dm-success hover:bg-dm-success hover:text-white border border-dm-success/30 transition-colors"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom damage / heal runner */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-dm-border/60">
                  <span className="text-[11px] text-dm-textMuted font-semibold">Точное число:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="напр. 17"
                    value={quickCalcValue}
                    onChange={(e) => setQuickCalcValue(e.target.value)}
                    className="w-20 bg-dm-card border border-dm-border rounded px-2 py-0.5 text-xs text-dm-text focus:outline-none focus:border-dm-accent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyQuickCalc(true);
                    }}
                  />
                  <button
                    onClick={() => handleApplyQuickCalc(true)}
                    disabled={!quickCalcValue}
                    className="px-2 py-0.5 rounded bg-dm-danger hover:bg-dm-dangerHover text-white text-[10px] font-bold transition-colors disabled:opacity-40"
                  >
                    - Урон
                  </button>
                  <button
                    onClick={() => handleApplyQuickCalc(false)}
                    disabled={!quickCalcValue}
                    className="px-2 py-0.5 rounded bg-dm-success hover:bg-dm-successHover text-white text-[10px] font-bold transition-colors disabled:opacity-40"
                  >
                    + Хил
                  </button>
                  <button
                    onClick={() => setShowDamagePalette(false)}
                    className="text-[10px] text-dm-textMuted hover:text-dm-text ml-auto"
                  >
                    Скрыть
                  </button>
                </div>
              </div>
            )}

            {/* Temp HP Quick Input Form */}
            {showTempHpInput && (
              <div className="flex items-center gap-1.5 bg-dm-card p-1.5 rounded border border-sky-500/30 text-xs animate-fadeIn">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] text-sky-300">Временные хиты:</span>
                <input
                  type="number"
                  min="0"
                  value={tempHpInputVal}
                  onChange={(e) => setTempHpInputVal(e.target.value)}
                  placeholder="напр. 10"
                  className="w-16 bg-dm-bg border border-dm-border rounded px-1.5 py-0.5 text-xs text-dm-text focus:outline-none focus:border-sky-400"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTempHp()}
                />
                <button
                  onClick={handleAddTempHp}
                  className="px-2 py-0.5 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-bold transition-colors"
                >
                  Ок
                </button>
                <button
                  onClick={() => setShowTempHpInput(false)}
                  className="text-dm-textMuted hover:text-dm-text text-[10px] px-1"
                >
                  Отмена
                </button>
              </div>
            )}

            {/* HP Bar */}
            <div className="w-full h-1.5 bg-dm-card rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-300 ${hpColor}`} 
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
              {/* Temp HP overlay */}
              {combatant.tempHp > 0 && (
                <div 
                  className="absolute top-0 left-0 h-full bg-sky-400/50 transition-all duration-300"
                  style={{ width: `${Math.min(100, (combatant.tempHp / combatant.maxHp) * 100)}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Combatant Notes Section (Markdown Supported) */}
      {showNotes && (
        <div className="px-3 pb-3 pt-1 border-t border-dm-border/60 bg-dm-card/50 flex flex-col gap-1.5 animate-fadeIn">
          <div className="flex items-center justify-between text-[11px] text-dm-textMuted font-semibold">
            <span className="flex items-center gap-1 text-dm-accent">
              <FileText className="w-3.5 h-3.5" />
              Заметки мастера для {combatant.name} <span className="text-[10px] text-dm-textSubtle">(Markdown)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="text-[10px] text-dm-accent hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingNotes ? 'Просмотр' : 'Редактировать'}
              </button>
              <button
                onClick={() => setShowNotes(false)}
                className="text-[10px] text-dm-textMuted hover:text-dm-text"
              >
                Свернуть
              </button>
            </div>
          </div>

          {isEditingNotes ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Спасброски, иммунитеты, концентрация, напоминания (# заголовок, **жирный**, - списки)..."
              rows={3}
              className="w-full bg-dm-bg border border-dm-border rounded p-2 text-xs text-dm-text placeholder:text-dm-textSubtle focus:outline-none focus:border-dm-accent resize-y font-mono leading-relaxed"
              autoFocus
            />
          ) : (
            <div 
              onClick={() => setIsEditingNotes(true)}
              className="w-full bg-dm-bg/80 border border-dm-border rounded p-2.5 min-h-[50px] cursor-pointer hover:border-dm-accent/50 transition-colors"
              title="Нажмите для редактирования заметки"
            >
              {combatant.notes ? (
                <MarkdownViewer content={combatant.notes} />
              ) : (
                <span className="text-dm-textSubtle italic text-xs">
                  Заметок пока нет. Нажмите сюда для ввода (поддерживается Markdown).
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Combatant Attacks & Dice Rolls Section (Expandable) */}
      {showActions && (
        <div className="px-3 pb-3 pt-2 border-t border-dm-danger/30 bg-dm-bg/70 flex flex-col gap-2.5 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dm-danger flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              Атаки и броски кубов: {combatant.name}
            </span>
            <button
              onClick={() => setShowActions(false)}
              className="text-dm-textMuted hover:text-dm-text text-[10px]"
            >
              Свернуть
            </button>
          </div>

          {/* Stat Checks Row */}
          {hasStats && combatant.stats && (
            <div>
              <div className="text-[10px] text-dm-textMuted mb-1 font-semibold">
                Проверки характеристик (клик для броска d20):
              </div>
              <div className="grid grid-cols-6 gap-1 bg-dm-panel p-1.5 rounded border border-dm-border text-center">
                {[
                  { label: 'СИЛ', val: combatant.stats.str },
                  { label: 'ЛОВ', val: combatant.stats.dex },
                  { label: 'ТЕЛ', val: combatant.stats.con },
                  { label: 'ИНТ', val: combatant.stats.int },
                  { label: 'МУД', val: combatant.stats.wis },
                  { label: 'ХАР', val: combatant.stats.cha }
                ].map(s => {
                  const mod = calculateModifier(s.val);
                  return (
                    <button
                      key={s.label}
                      onClick={() => handleRollStat(s.label, s.val)}
                      className="flex flex-col items-center py-0.5 rounded hover:bg-dm-card transition-colors group cursor-pointer"
                      title={`Проверка ${s.label}: 1d20${formatModifier(mod)}`}
                    >
                      <span className="text-[9px] text-dm-textMuted font-bold">{s.label}</span>
                      <span className="text-[10px] text-dm-danger font-mono font-bold group-hover:underline">
                        {formatModifier(mod)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Monster Actions */}
          {hasActions && combatant.actions && combatant.actions.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {combatant.actions.map(act => {
                const atkBonus = extractAttackBonus(act.desc);
                const dmgFormula = extractDamageFormula(act.desc);

                return (
                  <div key={act.name} className="p-2 rounded bg-dm-panel border border-dm-border flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-dm-text">{act.name}</span>
                      
                      {/* Action Roll Buttons */}
                      <div className="flex items-center gap-1">
                        {atkBonus !== null && (
                          <button
                            onClick={() => handleRollActionAttack(act.name, atkBonus)}
                            className="px-2 py-0.5 rounded bg-dm-accent/20 border border-dm-accent/40 text-dm-accent hover:bg-dm-accent hover:text-white text-[10px] font-bold font-mono transition-colors flex items-center gap-1 shadow-sm"
                            title={`Бросок атаки: 1d20${atkBonus >= 0 ? '+' : ''}${atkBonus}`}
                          >
                            <Dices className="w-3 h-3" />
                            <span>Атака {atkBonus >= 0 ? `+${atkBonus}` : atkBonus}</span>
                          </button>
                        )}

                        {dmgFormula && (
                          <button
                            onClick={() => handleRollActionDamage(act.name, dmgFormula)}
                            className="px-2 py-0.5 rounded bg-dm-danger/20 border border-dm-danger/40 text-dm-danger hover:bg-dm-danger hover:text-white text-[10px] font-bold font-mono transition-colors flex items-center gap-1 shadow-sm"
                            title={`Бросок урона: ${dmgFormula}`}
                          >
                            <span>💥 Урон {dmgFormula}</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-dm-textMuted leading-snug">{act.desc}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] text-dm-textMuted italic">
              У этого персонажа нет предустановленных действий. Используйте быстрые кубы ниже:
            </div>
          )}

          {/* Quick Dice Rollers & Custom Input */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-dm-border/60">
            <div className="flex gap-1 flex-wrap">
              <button 
                onClick={() => handleQuickDice(20)} 
                className="px-1.5 py-0.5 rounded bg-dm-card border border-dm-border hover:border-dm-accent hover:text-dm-accent text-xs font-mono font-bold text-dm-text transition-colors"
                title="Бросить d20"
              >
                d20
              </button>
              <button 
                onClick={() => handleQuickDice(6)} 
                className="px-1.5 py-0.5 rounded bg-dm-card border border-dm-border hover:border-dm-accent hover:text-dm-accent text-xs font-mono font-bold text-dm-text transition-colors"
                title="Бросить d6"
              >
                d6
              </button>
              <button 
                onClick={() => handleQuickDice(8)} 
                className="px-1.5 py-0.5 rounded bg-dm-card border border-dm-border hover:border-dm-accent hover:text-dm-accent text-xs font-mono font-bold text-dm-text transition-colors"
                title="Бросить d8"
              >
                d8
              </button>
              <button 
                onClick={() => handleQuickDice(10)} 
                className="px-1.5 py-0.5 rounded bg-dm-card border border-dm-border hover:border-dm-accent hover:text-dm-accent text-xs font-mono font-bold text-dm-text transition-colors"
                title="Бросить d10"
              >
                d10
              </button>
              <button 
                onClick={() => handleQuickDice(12)} 
                className="px-1.5 py-0.5 rounded bg-dm-card border border-dm-border hover:border-dm-accent hover:text-dm-accent text-xs font-mono font-bold text-dm-text transition-colors"
                title="Бросить d12"
              >
                d12
              </button>
            </div>

            {/* Custom formula roll input */}
            <form onSubmit={handleCustomDiceRoll} className="flex items-center gap-1">
              <input
                type="text"
                placeholder="2d6+3, 1d20+5"
                value={customDiceFormula}
                onChange={(e) => setCustomDiceFormula(e.target.value)}
                className="w-24 bg-dm-bg border border-dm-border rounded px-1.5 py-0.5 text-xs text-dm-text focus:outline-none focus:border-dm-danger"
              />
              <button
                type="submit"
                disabled={!customDiceFormula.trim()}
                className="px-2 py-0.5 bg-dm-danger hover:bg-dm-dangerHover text-white text-[10px] font-bold rounded transition-colors disabled:opacity-40"
              >
                Бросок
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Conditions & Spells Bar */}
      <div className="px-3 pb-3 flex flex-wrap items-center gap-1.5">
        {/* Condition Picker Button */}
        <button 
          onClick={() => setShowConditions(!showConditions)}
          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
            showConditions 
              ? 'bg-dm-card border-dm-border text-dm-text' 
              : 'bg-transparent border-dashed border-dm-borderLight text-dm-textMuted hover:border-dm-textMuted'
          }`}
        >
          + Состояние
        </button>

        {/* Attach Spell Button */}
        <button 
          onClick={() => setShowSpellModal(true)}
          className="px-2 py-0.5 rounded text-[10px] font-medium border border-dashed border-dm-magic/50 text-dm-magic hover:bg-dm-magic/10 transition-colors flex items-center gap-1"
          title="Прикрепить заклинание к бойцу"
        >
          <Sparkles className="w-3 h-3" />
          + Спелл
        </button>
        
        {/* Conditions Chips */}
        {combatant.conditions?.map(cId => {
          const c = DND_CONDITIONS.find(cond => cond.id === cId);
          if (!c) return null;
          return (
            <span 
              key={c.id} 
              onClick={() => toggleCondition(c.id)} 
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border cursor-pointer ${c.bgColor} ${c.color} ${c.borderColor} hover:opacity-80 transition-opacity`}
              title="Нажмите, чтобы снять состояние"
            >
              {c.nameRu} ×
            </span>
          );
        })}

        {/* Attached Spells Chips */}
        {attachedSpells.map(spell => (
          <span 
            key={spell.id} 
            onClick={() => onOpenSpell(spell.id)} 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-dm-magic/20 text-dm-magic border border-dm-magic/40 cursor-pointer hover:bg-dm-magic/30 transition-colors"
            title={`${spell.nameRu} (${spell.level === 0 ? 'Заговор' : `${spell.level} круг`}) — нажмите для описания`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{spell.nameRu}</span>
            <button
              onClick={(e) => handleRemoveSpell(spell.id, e)}
              className="ml-0.5 text-dm-magic/70 hover:text-white hover:bg-dm-magic rounded-full p-0.2"
              title="Открепить заклинание"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Conditions Picker Dropdown */}
      {showConditions && (
        <div className="absolute top-full left-0 z-40 mt-1 w-full bg-dm-panel border border-dm-border rounded-lg shadow-2xl p-2 grid grid-cols-2 gap-1 max-h-52 overflow-y-auto custom-scrollbar animate-fadeIn">
          {DND_CONDITIONS.map(c => {
            const isConditionActive = combatant.conditions?.includes(c.id);
            return (
              <div 
                key={c.id} 
                onClick={() => toggleCondition(c.id)}
                className={`px-2 py-1.5 rounded text-xs cursor-pointer border transition-colors flex items-center justify-between ${
                  isConditionActive 
                    ? `${c.bgColor} border-transparent ${c.color}` 
                    : 'bg-dm-bg border-dm-border text-dm-textMuted hover:border-dm-text'
                }`}
              >
                <span>{c.nameRu}</span>
                {isConditionActive && <Eye className="w-3 h-3" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Spell Modal */}
      {showSpellModal && (
        <AttachSpellModal
          combatant={combatant}
          onClose={() => setShowSpellModal(false)}
          onOpenSpellDetails={onOpenSpell}
        />
      )}
    </div>
  );
};
