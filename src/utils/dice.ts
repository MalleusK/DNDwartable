import { db } from '../db/db';
import { DiceRollLog } from '../types';

/**
 * Parses a dice formula (e.g., "2d6+3", "1d20 - 1", "1к8+2") and returns a random result.
 * Supports standard dice: d4, d6, d8, d10, d12, d20, d100.
 */

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  formula: string;
}

export function rollDice(formula: string): RollResult {
  // Replace Russian 'к' with Latin 'd', remove spaces
  const normalizedFormula = formula
    .replace(/\s+/g, '')
    .replace(/к/gi, 'd')
    .toLowerCase();
  
  // Pattern: 2d6+3, 1d20-1, d8, d20+4
  const match = normalizedFormula.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  
  if (!match) {
    throw new Error(`Неверная формула кубов: ${formula}`);
  }

  const numDice = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (numDice <= 0 || sides <= 0) {
    throw new Error(`Недопустимые параметры: ${numDice}d${sides}`);
  }

  const rolls: number[] = [];
  let sum = 0;

  for (let i = 0; i < numDice; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }

  const total = sum + modifier;

  return {
    total,
    rolls,
    modifier,
    formula: normalizedFormula
  };
}

/**
 * Convenience function to get a single d20 roll
 */
export function rollD20(modifier: number = 0): RollResult {
  return rollDice(`1d20${modifier >= 0 ? '+' : ''}${modifier}`);
}

/**
 * Calculate stat modifier from score. e.g. 10 -> 0, 12 -> 1, 8 -> -1
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Format modifier to string with sign (e.g., "+2", "-1", "+0")
 */
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Tries to extract an attack bonus (+X or -X) from action description
 */
export function extractAttackBonus(text: string): number | null {
  const match = text.match(/([+-]\d+)\s*(?:к\s*попаданию|to\s*hit)/i) || text.match(/(?:атака|бонус|hit)\s*:\s*([+-]\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

/**
 * Tries to extract a damage dice formula (e.g. 1d8+2, 2к6+3, 1d6) from action description
 */
export function extractDamageFormula(text: string): string | null {
  const normalized = text.replace(/к/gi, 'd');
  // Match e.g. "урон 1d8+2" or "1d8 + 2" or "2d6"
  const match = normalized.match(/(?:урон|damage)?\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  if (match) return match[1].replace(/\s+/g, '');
  return null;
}

/**
 * Executes a roll, logs it in IndexedDB and broadcasts a window event for UI notifications
 */
export async function executeRollAndLog(formula: string, label: string = 'Бросок'): Promise<DiceRollLog> {
  const result = rollDice(formula);
  const isD20 = formula.toLowerCase().includes('d20') || formula.toLowerCase().includes('к20');
  const isCrit = isD20 && result.rolls.length === 1 && result.rolls[0] === 20;
  const isFumble = isD20 && result.rolls.length === 1 && result.rolls[0] === 1;

  const logEntry: DiceRollLog = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    formula: `${label}: ${result.formula}`,
    results: result.rolls,
    modifier: result.modifier,
    total: result.total,
    isCrit,
    isFumble,
  };

  try {
    await db.diceRollLogs.add(logEntry);
  } catch (err) {
    console.error('Failed to log dice roll', err);
  }

  // Notify UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dm-dice-roll', { detail: logEntry }));
  }

  return logEntry;
}
