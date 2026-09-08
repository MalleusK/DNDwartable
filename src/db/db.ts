import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Campaign, Combatant, Monster, Encounter, Spell, SessionNote, DiceRollLog } from '../types';

import { mockSpells } from '../data/mockSpells';
import { mockMonsters } from '../data/mockMonsters';

export class DMCommandDeckDB extends Dexie {
  campaigns!: Table<Campaign, string>;
  combatants!: Table<Combatant, string>;
  monsters!: Table<Monster, string>;
  encounters!: Table<Encounter, string>;
  spells!: Table<Spell, string>;
  sessionNotes!: Table<SessionNote, string>;
  diceRollLogs!: Table<DiceRollLog, string>; // Не в плане, но нужно для хранения лога бросков

  constructor() {
    super('DMCommandDeckDB');
    
    // Объявляем только ключи для поиска и связей
    this.version(1).stores({
      campaigns: 'id, createdAt',
      combatants: 'id, campaignId, type, initiative',
      monsters: 'id, campaignId, cr',
      encounters: 'id, campaignId, status',
      spells: 'id, level, school',
      sessionNotes: 'id, campaignId, updatedAt',
      diceRollLogs: 'id, timestamp' // Для лога бросков
    });
  }
}

export const db = new DMCommandDeckDB();

export async function initDb() {
  const spellsCount = await db.spells.count();
  if (spellsCount === 0) {
    await db.spells.bulkAdd(mockSpells);
  }

  const monstersCount = await db.monsters.count();
  if (monstersCount === 0) {
    await db.monsters.bulkAdd(mockMonsters);
  }

  const campaignsCount = await db.campaigns.count();
  if (campaignsCount === 0) {
    const demoCampaignId = crypto.randomUUID();
    await db.campaigns.add({
      id: demoCampaignId,
      name: 'Затерянные рудники Фанделвера',
      description: 'Демонстрационная кампания',
      createdAt: Date.now(),
      currentRound: 0,
      activeCombatantId: null
    });

    // Добавим пару тестовых игроков
    await db.combatants.bulkAdd([
      {
        id: crypto.randomUUID(),
        campaignId: demoCampaignId,
        name: 'Воин (Демо)',
        type: 'player',
        maxHp: 30,
        currentHp: 30,
        tempHp: 0,
        ac: 16,
        passivePerception: 12,
        initiative: 0,
        conditions: [],
        spellIds: []
      },
      {
        id: crypto.randomUUID(),
        campaignId: demoCampaignId,
        name: 'Маг (Демо)',
        type: 'player',
        maxHp: 18,
        currentHp: 18,
        tempHp: 0,
        ac: 12,
        passivePerception: 14,
        initiative: 0,
        conditions: [],
        spellIds: mockSpells.slice(0, 3).map(s => s.id) // Добавим пару спеллов
      }
    ]);
  }
}

