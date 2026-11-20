export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export interface CageSection {
  id: string
  targetSum: number
  numCells: number
  eliminatedCombos: string[]
  split?: { first: CageSection; second: CageSection }
}

export interface TrackedCage extends CageSection {
  label: string
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

export interface CageAnalysis {
  section: CageSection
  combinations: number[][]
  remainingCombinations: number[][]
  split?: { first: CageAnalysis; second: CageAnalysis }
}

function digitMask(combo: number[]): number {
  return combo.reduce((mask, digit) => mask | (1 << (digit - 1)), 0)
}

function forEachSplitPair(
  first: number[][],
  second: number[][],
  visit: (firstMask: number, secondMask: number, combinedMask: number) => void,
) {
  const secondMasks = second.map(digitMask)
  for (const combo of first) {
    const firstMask = digitMask(combo)
    for (const secondMask of secondMasks) {
      if ((firstMask & secondMask) === 0) {
        visit(firstMask, secondMask, firstMask | secondMask)
      }
    }
  }
}

/** Enforce distinct digits and all eliminations across the whole split tree. */
export function analyzeCage(cage: CageSection): CageAnalysis {
  function build(section: CageSection): CageAnalysis {
    const combinations = findCombinations(section.targetSum, section.numCells)
    let remainingCombinations = combinations.filter(combo => !section.eliminatedCombos.includes(getComboKey(combo)))
    if (!section.split) return { section, combinations, remainingCombinations }

    const first = build(section.split.first)
    const second = build(section.split.second)
    const compatible = new Set<number>()
    forEachSplitPair(first.remainingCombinations, second.remainingCombinations, (_first, _second, combined) => {
      compatible.add(combined)
    })
    remainingCombinations = remainingCombinations.filter(combo => compatible.has(digitMask(combo)))
    return { section, combinations, remainingCombinations, split: { first, second } }
  }

  function constrainChildren(analysis: CageAnalysis): CageAnalysis {
    if (!analysis.split) return analysis
    const { first, second } = analysis.split
    const allowed = new Set(analysis.remainingCombinations.map(digitMask))
    const firstAllowed = new Set<number>()
    const secondAllowed = new Set<number>()
    forEachSplitPair(first.remainingCombinations, second.remainingCombinations, (firstMask, secondMask, combined) => {
      if (allowed.has(combined)) {
        firstAllowed.add(firstMask)
        secondAllowed.add(secondMask)
      }
    })
    return {
      ...analysis,
      split: {
        first: constrainChildren({
          ...first,
          remainingCombinations: first.remainingCombinations.filter(combo => firstAllowed.has(digitMask(combo))),
        }),
        second: constrainChildren({
          ...second,
          remainingCombinations: second.remainingCombinations.filter(combo => secondAllowed.has(digitMask(combo))),
        }),
      },
    }
  }

  return constrainChildren(build(cage))
}

function findCageSection(section: CageSection, id: string): CageSection | undefined {
  if (section.id === id) return section
  if (!section.split) return undefined
  return findCageSection(section.split.first, id) ?? findCageSection(section.split.second, id)
}

export function updateCageSection(
  cage: TrackedCage,
  sectionId: string,
  update: (section: CageSection) => CageSection,
): TrackedCage {
  let found = false
  function visit(section: CageSection): CageSection {
    if (section.id === sectionId) {
      found = true
      return update(section)
    }
    if (!section.split) return section
    return { ...section, split: { first: visit(section.split.first), second: visit(section.split.second) } }
  }
  const updated = { ...cage, ...visit(cage) }
  if (!found) throw new Error('This subsection no longer exists.')
  return updated
}

type CageSplitResult = { ok: true; cage: TrackedCage } | { ok: false; error: string }

export function splitCageSection(
  cage: TrackedCage,
  sectionId: string,
  first: { numCells: number; targetSum: number },
): CageSplitResult {
  const section = findCageSection(cage, sectionId)
  if (!section) return { ok: false, error: 'This subsection no longer exists.' }
  if (section.split) return { ok: false, error: 'This section is already split. Choose one of its subsections.' }
  if (section.numCells < 2) return { ok: false, error: 'A section needs at least two cells to split.' }
  if (!Number.isInteger(first.numCells) || first.numCells < 1 || first.numCells >= section.numCells) {
    return { ok: false, error: `Use a whole number of cells between 1 and ${section.numCells - 1}.` }
  }
  if (!Number.isInteger(first.targetSum)) return { ok: false, error: 'Enter a whole-number sum.' }

  const remainder = { numCells: section.numCells - first.numCells, targetSum: section.targetSum - first.targetSum }
  for (const [part, label] of [[first, 'First subsection'], [remainder, 'Remaining subsection']] as const) {
    const { min, max } = sumBounds(part.numCells)
    if (part.targetSum < min || part.targetSum > max) {
      return { ok: false, error: `${label}: ${part.numCells} cells must sum to between ${min} and ${max}.` }
    }
  }

  const updated = updateCageSection(cage, sectionId, current => ({
    ...current,
    split: {
      first: { id: crypto.randomUUID(), ...first, eliminatedCombos: [] },
      second: { id: crypto.randomUUID(), ...remainder, eliminatedCombos: [] },
    },
  }))
  if (analyzeCage(updated).remainingCombinations.length === 0) {
    return { ok: false, error: 'No valid split: the subsections must use distinct digits and respect the remaining combinations.' }
  }
  return { ok: true, cage: updated }
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
