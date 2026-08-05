export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export interface TrackedCage {
  id: string
  label: string
  targetSum: number
  numCells: number
  eliminatedCombos: string[]
  /** Sudoku boxes this cage touches, as "row.col" (e.g. "1.2"). Optional: cages
   *  created before box-aware naming existed simply don't have it. */
  boxes?: string[]
}

/** Every set of distinct digits 1-9 of the given size that sums to the target. */
export function findCombinations(targetSum: number, numCells: number): number[][] {
  const results: number[][] = []

  function backtrack(start: number, combo: number[], sum: number) {
    if (combo.length === numCells) {
      if (sum === targetSum) results.push([...combo])
      return
    }
    if (sum >= targetSum) return
    if (combo.length + (DIGITS.length - start) < numCells) return

    for (let i = start; i < DIGITS.length; i++) {
      combo.push(DIGITS[i])
      backtrack(i + 1, combo, sum + DIGITS[i])
      combo.pop()
    }
  }

  backtrack(0, [], 0)
  return results
}

export function getComboKey(combo: number[]): string {
  return combo.join('-')
}

/** The lowest and highest sums reachable with `numCells` distinct digits. */
export function sumBounds(numCells: number): { min: number; max: number } {
  let min = 0
  let max = 0
  for (let i = 0; i < numCells; i++) {
    min += i + 1
    max += 9 - i
  }
  return { min, max }
}

export interface ComboAnalysis {
  combos: number[][]
  /** Digits present in *every* combo — guaranteed to be in the cage. */
  alwaysPresent: number[]
  /** Digits present in *no* combo — guaranteed to be outside the cage. */
  neverPresent: number[]
}

export function analyzeCombos(combos: number[][]): ComboAnalysis {
  if (combos.length === 0) {
    return { combos, alwaysPresent: [], neverPresent: [...DIGITS] }
  }

  const counts = new Map<number, number>()
  for (const combo of combos) {
    for (const digit of combo) {
      counts.set(digit, (counts.get(digit) ?? 0) + 1)
    }
  }

  const alwaysPresent = DIGITS.filter(d => counts.get(d) === combos.length)
  const neverPresent = DIGITS.filter(d => !counts.has(d))

  return { combos, alwaysPresent, neverPresent }
}

export const BOX_IDS: string[] = [1, 2, 3].flatMap(row => [1, 2, 3].map(col => `${row}.${col}`))

/** Sort boxes into reading order so a given set of boxes always renders the same way. */
export function sortBoxes(boxes: string[]): string[] {
  return [...new Set(boxes)].sort((a, b) => BOX_IDS.indexOf(a) - BOX_IDS.indexOf(b))
}

/**
 * Build a cage label from its boxes and sum, e.g. `1.2 1.3 2.2 28`.
 *
 * A trailing number is appended only when it's needed to tell apart cages that
 * would otherwise share a label — the second cage of that sum in that box
 * becomes `... 2`, the third `... 3`, and so on.
 */
export function buildCageLabel(boxes: string[], targetSum: number, existingLabels: string[]): string {
  const sorted = sortBoxes(boxes)
  const base = sorted.length > 0 ? `${sorted.join(' ')} ${targetSum}` : `${targetSum}`

  const taken = new Set(existingLabels)
  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base} ${suffix}`)) suffix++
  return `${base} ${suffix}`
}
