export type CombatantType = 'player' | 'monster';

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
  description?: string;
  currentRound: number; // 0, 1, 2... (Защита от F5)
  activeCombatantId: string | null; // ID бойца, чей ход (Защита от F5)
}

export interface Combatant {
  id: string;
  campaignId: string;
  name: string;
  type: CombatantType;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  ac: number;
  passivePerception: number;
  initiative: number;
  avatar?: string; // base64 webp/jpeg 256x256
  notes?: string;
  conditions: string[]; // ['blinded', 'concentration', ...]
  spellIds: string[]; // id спеллов
}

export interface MonsterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface MonsterAction {
  name: string;
  desc: string;
}

export interface MonsterTrait {
  name: string;
  desc: string;
}

export interface Monster {
  id: string;
  campaignId: string; // 'global' или конкретная кампания
  name: string;
  cr: string; // "1/4", "1", "5", etc.
  ac: number;
  hp: number;
  speed: string;
  stats: MonsterStats;
  actions: MonsterAction[];
  traits?: MonsterTrait[];
  spells: string[];
  isCustom: boolean;
}

export interface EncounterMonsterConfig {
  monsterId: string;
  name: string;
  count: number;
  customHp?: number;
  customInit?: number;
}

export interface Encounter {
  id: string;
  campaignId: string;
  name: string;
  status: 'planned' | 'active';
  combatantsData: EncounterMonsterConfig[];
  notes?: string;
}

export interface Spell {
  id: string;
  nameRu: string;
  nameEn: string;
  level: number; // 0 = заговор, 1-9
  school: string; // Воплощение, Ограждение, etc.
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes?: string[];
}

export interface SessionNote {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface DiceRollLog {
  id: string;
  timestamp: number;
  formula: string;
  results: number[];
  modifier: number;
  total: number;
  isCrit?: boolean;
  isFumble?: boolean;
}

export interface ConditionInfo {
  id: string;
  nameRu: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}
