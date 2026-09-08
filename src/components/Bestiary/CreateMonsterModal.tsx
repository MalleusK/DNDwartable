import React, { useState } from 'react';
import { Monster, MonsterAction } from '../../types';
import { db } from '../../db/db';
import { X, Plus, Trash2, Skull } from 'lucide-react';

interface CreateMonsterModalProps {
  campaignId: string;
  onClose: () => void;
  onCreated?: (monster: Monster) => void;
}

export const CreateMonsterModal: React.FC<CreateMonsterModalProps> = ({
  campaignId,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [cr, setCr] = useState('1');
  const [ac, setAc] = useState<number | ''>(12);
  const [hp, setHp] = useState<number | ''>(25);
  const [speed, setSpeed] = useState('30 фт.');
  
  // Stats
  const [str, setStr] = useState(14);
  const [dex, setDex] = useState(12);
  const [con, setCon] = useState(14);
  const [int, setInt] = useState(8);
  const [wis, setWis] = useState(10);
  const [cha, setCha] = useState(8);

  // Actions
  const [actions, setActions] = useState<MonsterAction[]>([
    { name: 'Атака оружием / когтями', desc: '+4 к попаданию, досягаемость 5 фт., урон 1d8 + 2 рубящий' }
  ]);
  const [newActionName, setNewActionName] = useState('');
  const [newActionDesc, setNewActionDesc] = useState('');

  const handleAddAction = () => {
    if (!newActionName.trim()) return;
    setActions([
      ...actions,
      { name: newActionName.trim(), desc: newActionDesc.trim() || 'Атака' }
    ]);
    setNewActionName('');
    setNewActionDesc('');
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const newMonster: Monster = {
      id: crypto.randomUUID(),
      campaignId: campaignId || 'global',
      name: name.trim(),
      cr,
      ac: Number(ac) || 10,
      hp: Number(hp) || 15,
      speed: speed.trim() || '30 фт.',
      stats: {
        str: Number(str) || 10,
        dex: Number(dex) || 10,
        con: Number(con) || 10,
        int: Number(int) || 10,
        wis: Number(wis) || 10,
        cha: Number(cha) || 10,
      },
      actions: actions.length > 0 ? actions : [
        { name: 'Базовая атака', desc: '+3 к попаданию, урон 1d6 + 1' }
      ],
      traits: [],
      spells: [],
      isCustom: true,
    };

    await db.monsters.add(newMonster);
    if (onCreated) onCreated(newMonster);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-dm-panel border border-dm-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dm-border bg-dm-panelAlt">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-dm-danger" />
            <h2 className="text-base font-bold text-dm-text">Создать нового монстра в Бестиарий</h2>
          </div>
          <button onClick={onClose} className="text-dm-textMuted hover:text-dm-text p-1 rounded hover:bg-dm-bg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs text-dm-text custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-dm-textMuted mb-1 font-semibold">Имя монстра / существа *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="напр. Теневой Варг, Орк-шаман, Драконий голем..."
                className="w-full bg-dm-bg border border-dm-border rounded px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-danger"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-dm-textMuted mb-1 font-semibold">Опасность (CR)</label>
              <select
                value={cr}
                onChange={(e) => setCr(e.target.value)}
                className="w-full bg-dm-bg border border-dm-border rounded px-3 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-danger"
              >
                <option value="0">0</option>
                <option value="1/8">1/8</option>
                <option value="1/4">1/4</option>
                <option value="1/2">1/2</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(n => (
                  <option key={n} value={n.toString()}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Combat Stats: AC, HP, Speed */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-dm-textMuted mb-1 font-semibold">Класс Доспеха (AC)</label>
              <input
                type="number"
                min="1"
                value={ac}
                onChange={(e) => setAc(parseInt(e.target.value, 10) || '')}
                className="w-full bg-dm-bg border border-dm-border rounded px-3 py-1.5 text-dm-text focus:outline-none focus:border-dm-danger"
              />
            </div>
            <div>
              <label className="block text-dm-textMuted mb-1 font-semibold">Хиты (HP)</label>
              <input
                type="number"
                min="1"
                value={hp}
                onChange={(e) => setHp(parseInt(e.target.value, 10) || '')}
                className="w-full bg-dm-bg border border-dm-border rounded px-3 py-1.5 text-dm-text focus:outline-none focus:border-dm-danger"
              />
            </div>
            <div>
              <label className="block text-dm-textMuted mb-1 font-semibold">Скорость</label>
              <input
                type="text"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                placeholder="30 фт."
                className="w-full bg-dm-bg border border-dm-border rounded px-3 py-1.5 text-dm-text focus:outline-none focus:border-dm-danger"
              />
            </div>
          </div>

          {/* Attributes */}
          <div>
            <label className="block text-dm-textMuted mb-2 font-semibold">Характеристики (Scores)</label>
            <div className="grid grid-cols-6 gap-2 text-center">
              {[
                { label: 'СИЛ (STR)', val: str, set: setStr },
                { label: 'ЛОВ (DEX)', val: dex, set: setDex },
                { label: 'ТЕЛ (CON)', val: con, set: setCon },
                { label: 'ИНТ (INT)', val: int, set: setInt },
                { label: 'МУД (WIS)', val: wis, set: setWis },
                { label: 'ХАР (CHA)', val: cha, set: setCha },
              ].map(stat => {
                const mod = Math.floor((stat.val - 10) / 2);
                const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
                return (
                  <div key={stat.label} className="bg-dm-card p-2 rounded border border-dm-border flex flex-col items-center">
                    <span className="text-[10px] text-dm-textMuted font-bold">{stat.label}</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={stat.val}
                      onChange={(e) => stat.set(parseInt(e.target.value, 10) || 10)}
                      className="w-12 bg-dm-bg border border-dm-border rounded text-center py-1 text-xs text-dm-text mt-1 focus:outline-none focus:border-dm-danger font-bold"
                    />
                    <span className="text-[10px] text-dm-danger mt-0.5 font-mono">{modStr}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions / Attacks */}
          <div className="flex flex-col gap-2 border-t border-dm-border pt-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-dm-text">Атаки и Действия монстра (для бросков в бою)</label>
            </div>

            {/* List of current actions */}
            <div className="flex flex-col gap-2">
              {actions.map((act, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 p-2.5 rounded bg-dm-card border border-dm-border">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-dm-danger">{act.name}</span>
                    <p className="text-dm-textMuted text-[11px] mt-0.5">{act.desc}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveAction(idx)}
                    className="text-dm-textMuted hover:text-dm-danger p-1 rounded"
                    title="Удалить действие"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add action row */}
            <div className="bg-dm-bg p-3 rounded-lg border border-dm-border flex flex-col gap-2">
              <span className="font-medium text-dm-textSubtle text-[11px]">+ Добавить атаку / способность</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Название (напр. Укус, Огненный плевок)"
                  value={newActionName}
                  onChange={(e) => setNewActionName(e.target.value)}
                  className="bg-dm-panel border border-dm-border rounded px-2 py-1.5 text-xs text-dm-text focus:outline-none focus:border-dm-danger"
                />
                <input
                  type="text"
                  placeholder="Описание / бросок (напр. +5 к попаданию, урон 2d6 + 3)"
                  value={newActionDesc}
                  onChange={(e) => setNewActionDesc(e.target.value)}
                  className="md:col-span-2 bg-dm-panel border border-dm-border rounded px-2 py-1.5 text-xs text-dm-text focus:outline-none focus:border-dm-danger"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAction()}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddAction}
                  disabled={!newActionName.trim()}
                  className="px-3 py-1 rounded bg-dm-panel border border-dm-border hover:border-dm-danger hover:text-dm-danger text-dm-text text-xs flex items-center gap-1 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Добавить действие
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dm-border bg-dm-panelAlt flex justify-between items-center">
          <span className="text-[11px] text-dm-textMuted">
            Монстр сохранится в Бестиарий и его можно будет добавлять в бои с авто-бросками кубов!
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-dm-card text-dm-textMuted hover:text-dm-text text-xs font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 rounded-md bg-dm-danger text-white hover:bg-dm-dangerHover disabled:opacity-50 text-xs font-bold transition-colors shadow-lg shadow-dm-danger/20"
            >
              Сохранить монстра
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
