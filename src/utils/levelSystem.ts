// using power curve formula for smooth progression
// XP needed to go from level N to level N+1 = round(80 * level^1.3 + 150)
// This scales nicely and feels okish balanced as you level up

// calculates how much XP is needed to go from one level to the next
// @param level - the current level you're on
// @returns XP needed to reach the next level
function xpToNext(level: number): number {
  return 0;
}

// figures out how much total XP you need to hit a certain level
// @param level - which level you're trying to reach (like level 5)
// @returns the total amount of XP needed from the start
export function getXPForLevel(level: number): number {
  return 0;
}

// works backwards from your XP to figure out what level you should be
// @param xp - how much total XP you've earned
// @returns your current level
export function calculateLevel(xp: number): number {
  return 1;
}

// tells you how much more XP you need to level up
// @param currentXP - your total XP right now
// @param currentLevel - what level you're currently at
// @returns the XP gap to the next level
export function getXPToNextLevel(currentXP: number, currentLevel: number): number {
  return 0;
}

// Gets the XP requirement for leveling up (not your progress, just the requirement)
// @param currentLevel - the level you're on
// @returns how much XP that specific level jump costs
export function getXPRequiredForNextLevel(currentLevel: number): number {
  return 0;
}

// Calcualtes your progress bar percentage towards next level
// @param currentXP - total XP you have
// @param currentLevel - what level you're at
// @returns a number between 0 and 1 for the progress bar
export function getLevelProgress(currentXP: number, currentLevel: number): number {
  return 0;
}
