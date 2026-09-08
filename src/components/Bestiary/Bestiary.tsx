import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { Campaign, Combatant, Monster } from '../../types';
import { 
  Search, Filter, Shield, Activity, Plus, Trash2, 
  Dices, Sparkles 
} from 'lucide-react';
import { 
  rollD20, calculateModifier, formatModifier, 
  executeRollAndLog, extractAttackBonus, extractDamageFormula 
} from '../../utils/dice';
import { CreateMonsterModal } from './CreateMonsterModal';

interface BestiaryProps {
  currentCampaign: Campaign | null;
}

export const Bestiary: React.FC<BestiaryProps> = ({ currentCampaign }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCr, setSelectedCr] = useState<string>('all');
  const [filterCustomOnly, setFilterCustomOnly] = useState(false);
  const [expandedMonsterId, setExpandedMonsterId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingMonsterId, setDeletingMonsterId] = useState<string | null>(null);

  const monsters = useLiveQuery(() => db.monsters.toArray(), []) || [];

  const filteredMonsters = monsters.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCr = selectedCr === 'all' ? true : m.cr === selectedCr;
    const matchesCustom = filterCustomOnly ? Boolean(m.isCustom) : true;
    return matchesSearch && matchesCr && matchesCustom;
  });

  const allCrs = Array.from(new Set(monsters.map(m => m.cr))).sort((a, b) => {
    const parseCr = (cr: string) => {
      if (cr.includes('/')) {
        const [num, den] = cr.split('/');
        return parseInt(num, 10) / parseInt(den, 10);
      }
      return parseInt(cr, 10);
    };
    return parseCr(a) - parseCr(b);
  });

  const handleAddToCombat = async (monster: Monster, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCampaign) {
      alert('Сначала выберите или создайте кампанию!');
      return;
    }

    // Auto-numbering duplicate monsters
    const existingInCombat = await db.combatants
      .where('campaignId').equals(currentCampaign.id)
      .filter(c => c.name.startsWith(monster.name))
      .toArray();
      
    let finalName = monster.name;
    if (existingInCombat.length > 0) {
      finalName = `${monster.name} ${existingInCombat.length + 1}`;
    }

    const init = rollD20(calculateModifier(monster.stats.dex)).total;

    const newCombatant: Combatant = {
      id: crypto.randomUUID(),
      campaignId: currentCampaign.id,
      name: finalName,
      type: 'monster',
      maxHp: monster.hp,
      currentHp: monster.hp,
      tempHp: 0,
      ac: monster.ac,
      passivePerception: 10 + calculateModifier(monster.stats.wis),
      initiative: init,
      conditions: [],
      spellIds: monster.spells || [],
      monsterId: monster.id,
      stats: monster.stats,
      actions: monster.actions,
      traits: monster.traits,
    };

    await db.combatants.add(newCombatant);
  };

  const handleDeleteMonster = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.monsters.delete(id);
    setDeletingMonsterId(null);
  };

  const handleRollStat = async (monsterName: string, statLabel: string, score: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const mod = calculateModifier(score);
    await executeRollAndLog(`1d20${mod >= 0 ? '+' : ''}${mod}`, `[${monsterName}] Проверка ${statLabel}`);
  };

  const handleRollActionAttack = async (monsterName: string, actionName: string, bonus: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await executeRollAndLog(`1d20${bonus >= 0 ? '+' : ''}${bonus}`, `[${monsterName}] ${actionName} (Атака)`);
  };

  const handleRollActionDamage = async (monsterName: string, actionName: string, formula: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await executeRollAndLog(formula, `[${monsterName}] ${actionName} (Урон)`);
  };

  return (
    <div className="flex flex-col h-full bg-dm-bg rounded-lg border border-dm-border overflow-hidden">
      {/* Header with Search, Filter and Add Button */}
      <div className="p-4 bg-dm-panel border-b border-dm-border flex flex-col gap-3 shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dm-textMuted" />
            <input
              type="text"
              placeholder="Поиск монстра..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dm-bg border border-dm-border rounded-lg pl-9 pr-4 py-2 text-sm text-dm-text focus:outline-none focus:border-dm-danger transition-colors placeholder:text-dm-textSubtle"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-dm-danger hover:bg-dm-dangerHover text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-dm-danger/20 shrink-0"
            title="Создать собственного монстра"
          >
            <Plus className="w-4 h-4" />
            <span>Создать</span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
          <Filter className="w-4 h-4 text-dm-textMuted shrink-0" />
          <button
            onClick={() => {
              setSelectedCr('all');
              setFilterCustomOnly(false);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              selectedCr === 'all' && !filterCustomOnly 
                ? 'bg-dm-danger/20 text-dm-danger border-dm-danger/30 font-semibold' 
                : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilterCustomOnly(!filterCustomOnly)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border flex items-center gap-1 ${
              filterCustomOnly 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-semibold' 
                : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Свои монстры
          </button>
          {allCrs.map(cr => (
            <button
              key={cr}
              onClick={() => {
                setSelectedCr(cr);
                setFilterCustomOnly(false);
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                selectedCr === cr && !filterCustomOnly 
                  ? 'bg-dm-danger/20 text-dm-danger border-dm-danger/30 font-semibold' 
                  : 'bg-dm-card text-dm-textMuted border-transparent hover:bg-dm-cardHover'
              }`}
            >
              CR {cr}
            </button>
          ))}
        </div>
      </div>

      {/* Monsters List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {filteredMonsters.length === 0 ? (
          <div className="text-center text-dm-textMuted text-xs py-10">
            Монстры не найдены. Нажмите «Создать», чтобы добавить своего монстра!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredMonsters.map(monster => {
              const isExpanded = expandedMonsterId === monster.id;
              const isDeleting = deletingMonsterId === monster.id;

              return (
                <div 
                  key={monster.id}
                  className={`bg-dm-card border rounded-lg overflow-hidden transition-all flex flex-col ${
                    isExpanded ? 'border-dm-danger/60 ring-1 ring-dm-danger/30' : 'border-dm-border hover:border-dm-danger/40'
                  }`}
                >
                  {/* Card Header */}
                  <div 
                    onClick={() => setExpandedMonsterId(isExpanded ? null : monster.id)}
                    className="p-3 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-dm-text group-hover:text-dm-danger transition-colors text-base truncate">
                          {monster.name}
                        </h4>
                        {monster.isCustom && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Кастомный
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-dm-textMuted mt-0.5">
                        Опасность (CR): <strong className="text-dm-text font-mono">{monster.cr}</strong> • КД: {monster.ac} • ХП: {monster.hp}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Delete Custom Monster */}
                      {monster.isCustom && (
                        isDeleting ? (
                          <div className="flex items-center gap-1 bg-dm-danger/20 border border-dm-danger/40 rounded px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-dm-danger font-bold">Удалить?</span>
                            <button
                              onClick={(e) => handleDeleteMonster(monster.id, e)}
                              className="text-[10px] bg-dm-danger text-white px-1.5 py-0.5 rounded font-bold hover:bg-dm-dangerHover"
                            >
                              Да
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletingMonsterId(null); }}
                              className="text-[10px] text-dm-textMuted px-1"
                            >
                              Нет
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingMonsterId(monster.id); }}
                            className="p-1.5 text-dm-textMuted hover:text-dm-danger hover:bg-dm-panel rounded transition-colors"
                            title="Удалить кастомного монстра"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}

                      {/* Add to Combat Button */}
                      <button 
                        onClick={(e) => handleAddToCombat(monster, e)}
                        className="flex items-center gap-1 bg-dm-danger hover:bg-dm-dangerHover text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-lg shadow-dm-danger/20"
                        title="Добавить этого монстра в активный бой"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>В бой</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Statblock */}
                  {isExpanded && (
                    <div className="p-4 bg-dm-panelAlt border-t border-dm-border text-xs flex flex-col gap-3 animate-fadeIn">
                      <div className="flex gap-5 text-dm-text flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-dm-accent" />
                          <span className="text-dm-textMuted font-medium">КД:</span>
                          <span className="font-bold">{monster.ac}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-dm-success" />
                          <span className="text-dm-textMuted font-medium">ХП:</span>
                          <span className="font-bold">{monster.hp}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-dm-textMuted font-medium">Скорость:</span>
                          <span className="font-medium text-dm-text">{monster.speed}</span>
                        </div>
                      </div>

                      {/* Stats with clickable roll */}
                      <div>
                        <div className="text-[10px] text-dm-textMuted mb-1 font-semibold">
                          Характеристики (нажмите для проверки d20):
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 bg-dm-bg p-2 rounded-lg border border-dm-border text-center">
                          {[
                            { label: 'СИЛ', val: monster.stats.str },
                            { label: 'ЛОВ', val: monster.stats.dex },
                            { label: 'ТЕЛ', val: monster.stats.con },
                            { label: 'ИНТ', val: monster.stats.int },
                            { label: 'МУД', val: monster.stats.wis },
                            { label: 'ХАР', val: monster.stats.cha }
                          ].map(stat => {
                            const mod = calculateModifier(stat.val);
                            return (
                              <button 
                                key={stat.label} 
                                onClick={(e) => handleRollStat(monster.name, stat.label, stat.val, e)}
                                className="flex flex-col items-center p-1 rounded hover:bg-dm-card transition-colors group cursor-pointer"
                                title={`Бросить проверку ${stat.label}: 1d20${formatModifier(mod)}`}
                              >
                                <span className="text-[10px] text-dm-textMuted font-bold">{stat.label}</span>
                                <span className="font-bold text-dm-text text-sm">{stat.val}</span>
                                <span className="text-[10px] text-dm-danger font-mono font-bold group-hover:underline">
                                  {formatModifier(mod)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Traits */}
                      {monster.traits && monster.traits.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-2 border-t border-dm-border/60">
                          {monster.traits.map(t => (
                            <div key={t.name}>
                              <span className="font-bold text-dm-text italic">{t.name}. </span>
                              <span className="text-dm-textMuted">{t.desc}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions with clickable attack/damage rolls */}
                      {monster.actions && monster.actions.length > 0 && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-dm-border/60">
                          <div className="text-xs font-bold text-dm-danger uppercase tracking-wider flex items-center gap-1">
                            <Dices className="w-3.5 h-3.5" />
                            <span>Действия и Атаки</span>
                          </div>
                          {monster.actions.map(a => {
                            const atkBonus = extractAttackBonus(a.desc);
                            const dmgFormula = extractDamageFormula(a.desc);

                            return (
                              <div key={a.name} className="p-2.5 rounded-lg bg-dm-bg border border-dm-border flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-dm-text text-sm">{a.name}</span>
                                  
                                  {/* Quick roll buttons */}
                                  <div className="flex items-center gap-1.5">
                                    {atkBonus !== null && (
                                      <button
                                        onClick={(e) => handleRollActionAttack(monster.name, a.name, atkBonus, e)}
                                        className="px-2 py-0.5 rounded bg-dm-accent/20 border border-dm-accent/40 text-dm-accent hover:bg-dm-accent hover:text-white text-[11px] font-bold font-mono transition-colors flex items-center gap-1 shadow-sm"
                                        title={`Бросок атаки 1d20${atkBonus >= 0 ? '+' : ''}${atkBonus}`}
                                      >
                                        <Dices className="w-3 h-3" />
                                        <span>Атака {atkBonus >= 0 ? `+${atkBonus}` : atkBonus}</span>
                                      </button>
                                    )}

                                    {dmgFormula && (
                                      <button
                                        onClick={(e) => handleRollActionDamage(monster.name, a.name, dmgFormula, e)}
                                        className="px-2 py-0.5 rounded bg-dm-danger/20 border border-dm-danger/40 text-dm-danger hover:bg-dm-danger hover:text-white text-[11px] font-bold font-mono transition-colors flex items-center gap-1 shadow-sm"
                                        title={`Бросок урона: ${dmgFormula}`}
                                      >
                                        <span>💥 Урон {dmgFormula}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-dm-textMuted text-xs leading-relaxed">{a.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to create custom monster */}
      {showCreateModal && (
        <CreateMonsterModal
          campaignId={currentCampaign ? currentCampaign.id : 'global'}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};
