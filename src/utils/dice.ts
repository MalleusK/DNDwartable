/**
 * Parses a dice formula (e.g., "2d6+3", "1d20 - 1") and returns a random result.
 * Supports standard dice: d4, d6, d8, d10, d12, d20, d100.
 */

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  formula: string;
}

export function rollDice(formula: string): RollResult {
  const normalizedFormula = formula.replace(/\s+/g, '').toLowerCase();
  
  // Basic regex to match patterns like: 2d6+3, 1d20-1, d8
  const match = normalizedFormula.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  
  if (!match) {
    throw new Error(`Invalid dice formula: ${formula}`);
  }

  const numDice = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (numDice <= 0 || sides <= 0) {
    throw new Error(`Invalid dice parameters: ${numDice}d${sides}`);
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
 * Convenience function to just get a single d20 roll
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

