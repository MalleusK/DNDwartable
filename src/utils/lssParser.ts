import { Combatant, MonsterAction, MonsterStats, MonsterTrait } from '../types';

export interface ParsedLSSResult {
  name: string;
  className: string;
  subclass?: string;
  level: number;
  race: string;
  subrace?: string;
  background?: string;
  alignment?: string;
  stats: MonsterStats;
  maxHp: number;
  currentHp: number;
  ac: number;
  speed: number;
  passivePerception: number;
  initiativeBonus: number;
  proficiencyBonus: number;
  saves: string[];
  skills: string[];
  languages: string[];
  actions: MonsterAction[];
  traits: MonsterTrait[];
  equipment: string[];
  notesMarkdown: string;
}

/**
 * Рекурсивно извлекает чистый текст из узлов ProseMirror / Tiptap (формат LSS)
 */
function extractProseMirrorText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.type === 'formula') {
    const label = node.attrs?.label || '';
    const formula = node.attrs?.formula || '';
    if (label && formula) return `${label} (${formula})`;
    return label || formula || '';
  }
  if (node.type === 'paragraph') {
    return (node.content ? node.content.map(extractProseMirrorText).join('') : '') + '\n';
  }
  if (Array.isArray(node.content)) {
    return node.content.map(extractProseMirrorText).join('');
  }
  return '';
}

/**
 * Извлекает структурированные особенности и черты из doc-блока LSS
 */
function extractTraitsFromDoc(doc: any): MonsterTrait[] {
  const traits: MonsterTrait[] = [];
  if (!doc?.content || !Array.isArray(doc.content)) return traits;

  for (const block of doc.content) {
    if (block.type === 'spoiler') {
      const summaryNode = block.content?.find((c: any) => c.type === 'spoilerSummary');
      const contentNode = block.content?.find((c: any) => c.type === 'spoilerContent');

      let name = '';
      if (summaryNode) {
        const formula = summaryNode.content?.find((c: any) => c.type === 'formula');
        if (formula?.attrs?.label) {
          name = formula.attrs.label + (formula.attrs.formula ? ` [${formula.attrs.formula}]` : '');
        } else {
          name = extractProseMirrorText(summaryNode).trim();
        }
      }

      const desc = extractProseMirrorText(contentNode).trim();
      if (name || desc) {
        traits.push({
          name: name || 'Особенность',
          desc: desc || 'Без описания'
        });
      }
    }
  }
  return traits;
}

/**
 * Безопасно вычисляет простое математическое выражение вида "10+2" или "10+1*2"
 */
function safeEvalMath(expr: string, fallback: number = 10): number {
  try {
    const sanitized = expr.replace(/[^0-9+\-*/(). ]/g, '');
    if (!sanitized.trim()) return fallback;
    // Безопасное вычисление без eval
    const fn = new Function(`return (${sanitized})`);
    const val = fn();
    return typeof val === 'number' && !isNaN(val) ? Math.round(val) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Парсер персонажа из экспорта Long Story Short (LSS JSON)
 */
export function parseLSSCharacter(rawInput: string | object): ParsedLSSResult {
  let root: any;
  if (typeof rawInput === 'string') {
    try {
      root = JSON.parse(rawInput);
    } catch (e: any) {
      throw new Error(`Ошибка парсинга JSON: ${e.message}`);
    }
  } else {
    root = rawInput;
  }

  // В LSS данные могут лежать в корне или быть строкой в root.data
  let data: any = root;
  if (typeof root.data === 'string') {
    try {
      data = JSON.parse(root.data);
    } catch {
      data = root;
    }
  } else if (root.data && typeof root.data === 'object') {
    data = root.data;
  }

  // Основная информация
  const info = data.info || {};
  const charClass = info.charClass?.value || 'Воин';
  const charSubclass = info.charSubclass?.value || '';
  const level = Number(info.level?.value) || 1;
  const race = info.race?.value || 'Человек';
  const subrace = info.subrace?.value || '';
  const background = info.background?.value || '';
  const alignment = info.alignment?.value || '';
  
  // Имя персонажа (если не задано в LSS — формируем осмысленное)
  let rawName = data.name?.value?.trim();
  if (!rawName) {
    const fullRace = subrace ? `${race} (${subrace})` : race;
    rawName = `${fullRace} ${charClass} ${level} ур.`.trim();
  }

  // Характеристики
  const rawStats = data.stats || {};
  const stats: MonsterStats = {
    str: Number(rawStats.str?.score) || 10,
    dex: Number(rawStats.dex?.score) || 10,
    con: Number(rawStats.con?.score) || 10,
    int: Number(rawStats.int?.score) || 10,
    wis: Number(rawStats.wis?.score) || 10,
    cha: Number(rawStats.cha?.score) || 10,
  };

  const getMod = (score: number) => Math.floor((score - 10) / 2);
  const dexMod = getMod(stats.dex);
  const conMod = getMod(stats.con);
  const wisMod = getMod(stats.wis);

  const proficiencyBonus = Number(data.proficiency) || Math.floor((level - 1) / 4) + 2;

  // Бонусы, спасброски и навыки
  const bonuses = Array.isArray(data.bonuses) ? data.bonuses : [];
  
  // Спасброски с владением
  const saveMap: Record<string, string> = {
    'prof.save.str': 'СИЛ',
    'prof.save.dex': 'ЛОВ',
    'prof.save.con': 'ТЕЛ',
    'prof.save.int': 'ИНТ',
    'prof.save.wis': 'МУД',
    'prof.save.cha': 'ХАР'
  };
  const saves: string[] = [];
  for (const [targetKey, label] of Object.entries(saveMap)) {
    if (bonuses.some((b: any) => b.target === targetKey && (b.value >= 1 || b.mode === 'upgrade'))) {
      saves.push(label);
    }
  }

  // Навыки
  const skillTranslations: Record<string, string> = {
    athletics: 'Атлетика',
    acrobatics: 'Акробатика',
    'sleight of hand': 'Ловкость рук',
    stealth: 'Скрытность',
    arcana: 'Магия',
    history: 'История',
    investigation: 'Анализ',
    nature: 'Природа',
    religion: 'Религия',
    'animal handling': 'Уход за животными',
    insight: 'Проницательность',
    medicine: 'Медицина',
    perception: 'Внимание',
    survival: 'Выживание',
    deception: 'Обман',
    intimidation: 'Запугивание',
    performance: 'Выступление',
    persuasion: 'Убеждение'
  };

  const skills: string[] = [];
  let isPerceptionProf = false;

  for (const [skillKey, ruName] of Object.entries(skillTranslations)) {
    const isProf = bonuses.some(
      (b: any) => b.target === `prof.skill.${skillKey}` && (b.value >= 1 || b.mode === 'upgrade')
    ) || data.skills?.[skillKey]?.isProf;

    if (isProf) {
      skills.push(ruName);
      if (skillKey === 'perception') isPerceptionProf = true;
    }
  }

  // Пассивное восприятие: 10 + МУД + владение
  const passivePerception = 10 + wisMod + (isPerceptionProf ? proficiencyBonus : 0);

  // Скорость
  const speedBonus = bonuses.find((b: any) => b.target === 'speed.walk');
  const speed = Number(speedBonus?.value) || 30;

  // Класс доспеха (КД)
  const vitality = data.vitality || {};
  let ac = 10 + dexMod;
  const rawAc = vitality.ac?.value;
  if (typeof rawAc === 'number') {
    ac = rawAc;
  } else if (typeof rawAc === 'string') {
    let expr = rawAc
      .replace(/\[DEX(?: \(max 2\))?\]/gi, String(Math.min(2, dexMod)))
      .replace(/\[DEX\]/gi, String(dexMod))
      .replace(/\[CON\]/gi, String(conMod))
      .replace(/\[WIS\]/gi, String(wisMod));
    ac = safeEvalMath(expr, 10 + dexMod);
  }

  // Хиты (HP)
  let maxHp = 10;
  const rawMaxHp = vitality['hp-max']?.value;
  if (typeof rawMaxHp === 'number') {
    maxHp = rawMaxHp;
  } else if (typeof rawMaxHp === 'string') {
    let hpExpr = rawMaxHp
      .replace(/\[CON\]/gi, String(conMod))
      .replace(/\[LVL\]/gi, String(level));
    maxHp = safeEvalMath(hpExpr, 10);
  }
  const currentHp = typeof vitality['hp-current']?.value === 'number' 
    ? vitality['hp-current'].value 
    : maxHp;

  // Оружие и атаки
  const actions: MonsterAction[] = [];
  const weaponsList = Array.isArray(data.weaponsList) ? data.weaponsList : [];
  for (const w of weaponsList) {
    const wName = w.name?.value?.trim();
    const wDmg = w.dmg?.value?.trim();
    if (wName) {
      actions.push({
        name: wName,
        desc: wDmg ? `Урон: ${wDmg}` : 'Атака оружием'
      });
    }
  }

  // Ресурсы персонажа (напр. Второе дыхание, Очки чародейства, Ярость)
  const resources = data.resources || {};
  for (const res of Object.values(resources) as any[]) {
    if (res?.name) {
      const recharge = res.isShortRest ? 'Короткий отдых' : res.isLongRest ? 'Длинный отдых' : '';
      actions.push({
        name: `${res.name} (${res.max || 1}/${res.max || 1})`,
        desc: recharge ? `Восстановление: ${recharge}` : 'Классовый ресурс'
      });
    }
  }

  // Особенности и черты из текста LSS
  const traits: MonsterTrait[] = [];
  if (data.text?.traits?.value?.data) {
    const extracted = extractTraitsFromDoc(data.text.traits.value.data);
    traits.push(...extracted);
  }

  // Языки
  const languages: string[] = [];
  if (data.text?.prof?.value?.data) {
    const profText = extractProseMirrorText(data.text.prof.value.data);
    const match = profText.match(/Общий[^.\n]*/i) || profText.match(/Языки:?\s*([^\n]+)/i);
    if (match) {
      languages.push(...match[0].split(',').map((s: string) => s.trim()));
    }
  }

  // Снаряжение
  const equipment: string[] = [];
  if (data.text?.equipment?.value?.data) {
    const eqText = extractProseMirrorText(data.text.equipment.value.data);
    equipment.push(...eqText.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean));
  }

  // Монеты
  const coins = data.coins || {};
  const coinsStr = [
    coins.cp?.value ? `${coins.cp.value} мм` : '',
    coins.sp?.value ? `${coins.sp.value} см` : '',
    coins.ep?.value ? `${coins.ep.value} эм` : '',
    coins.gp?.value ? `${coins.gp.value} зм` : '',
    coins.pp?.value ? `${coins.pp.value} пм` : '',
  ].filter(Boolean).join(', ');

  // Генерируем красивый и полезный Markdown для заметок бойца
  const notesLines: string[] = [
    `## 🛡️ ${rawName}`,
    `*${race}${subrace ? ` (${subrace})` : ''} • ${charClass}${charSubclass ? ` (${charSubclass})` : ''} ${level} ур.*`,
    '',
    `>> «${rawName} вступает в бой!»`,
    '',
    `>! 🤫 **Пассивное внимание:** ${passivePerception} | **Скорость:** ${speed} фт. | **Бонус мастерства:** +${proficiencyBonus}`,
    saves.length > 0 ? `>! 🤫 **Владение спасбросками:** ${saves.join(', ')}` : '',
    skills.length > 0 ? `* **Навыки:** ${skills.join(', ')}` : '',
    languages.length > 0 ? `* **Языки:** ${languages.join(', ')}` : '',
    coinsStr ? `* **Кошелек:** ${coinsStr}` : '',
  ].filter(Boolean);

  if (equipment.length > 0) {
    notesLines.push('', '### 🎒 Снаряжение', equipment.slice(0, 10).map(e => `- ${e}`).join('\n'));
  }

  const notesMarkdown = notesLines.join('\n');

  return {
    name: rawName,
    className: charClass,
    subclass: charSubclass,
    level,
    race,
    subrace,
    background,
    alignment,
    stats,
    maxHp: Math.max(1, maxHp),
    currentHp: Math.max(1, currentHp),
    ac: Math.max(1, ac),
    speed,
    passivePerception,
    initiativeBonus: dexMod,
    proficiencyBonus,
    saves,
    skills,
    languages,
    actions,
    traits,
    equipment,
    notesMarkdown,
  };
}

/**
 * Преобразует распарсенный результат в готовый объект Combatant
 */
export function createCombatantFromLSS(
  parsed: ParsedLSSResult,
  campaignId: string,
  customInit?: number
): Combatant {
  return {
    id: crypto.randomUUID(),
    campaignId,
    name: parsed.name,
    type: 'player',
    maxHp: parsed.maxHp,
    currentHp: parsed.currentHp,
    tempHp: 0,
    ac: parsed.ac,
    passivePerception: parsed.passivePerception,
    initiative: customInit !== undefined ? customInit : parsed.initiativeBonus,
    conditions: [],
    spellIds: [],
    stats: parsed.stats,
    actions: parsed.actions,
    traits: parsed.traits,
    notes: parsed.notesMarkdown,
  };
}
