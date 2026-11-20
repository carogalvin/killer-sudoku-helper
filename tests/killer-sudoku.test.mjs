import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  analyzeCage,
  analyzeCombos,
  evaluateSumExpression,
  findCombinations,
  getComboKey,
  splitCageSection,
  updateCageSection,
} from '../src/lib/killer-sudoku.ts'

function cage(targetSum = 34, numCells = 6) {
  return { id: 'cage', label: 'Example', targetSum, numCells, eliminatedCombos: [], boxes: ['1.1'] }
}

function split(source, id, numCells, targetSum) {
  const result = splitCageSection(source, id, { numCells, targetSum })
  assert.equal(result.ok, true, result.error)
  return result.cage
}

test('existing cages retain their combinations and eliminations', () => {
  const source = { ...cage(10, 3), eliminatedCombos: ['1-4-5', '2-3-5'] }
  const analysis = analyzeCage(source)
  assert.deepEqual(analysis.combinations, findCombinations(10, 3))
  assert.deepEqual(analysis.remainingCombinations, [[1, 2, 7], [1, 3, 6]])
  assert.deepEqual(analyzeCombos(analysis.remainingCombinations).alwaysPresent, [1])
  assert.equal(analysis.split, undefined)
})

test('a split calculates its remainder and prevents shared digits between subsections', () => {
  const source = cage()
  const updated = split(source, source.id, 3, 15)
  assert.equal(source.split, undefined)
  assert.equal(updated.split.second.numCells, 3)
  assert.equal(updated.split.second.targetSum, 19)
  assert.equal(updated.label, source.label)
  assert.deepEqual(updated.boxes, source.boxes)
  const analysis = analyzeCage(updated)
  const small = analyzeCage(split(cage(10, 3), 'cage', 1, 1))
  assert.deepEqual(small.split.second.remainingCombinations, [[2, 7], [3, 6], [4, 5]])
  for (const first of analysis.split.first.remainingCombinations) {
    assert.ok(analysis.split.second.remainingCombinations.some(second => (
      first.every(digit => !second.includes(digit))
      && analysis.remainingCombinations.some(parent => getComboKey(parent) === getComboKey([...first, ...second].sort((a, b) => a - b)))
    )))
  }
})

test('multiple splits preserve constraints at every level and survive storage round trips', () => {
  const firstSplit = split(cage(), 'cage', 3, 15)
  const firstId = firstSplit.split.first.id
  const nested = split(firstSplit, firstId, 1, 1)
  assert.equal(nested.split.first.split.second.numCells, 2)
  assert.equal(nested.split.first.split.second.targetSum, 14)
  const analysis = analyzeCage(JSON.parse(JSON.stringify(nested)))
  assert.deepEqual(analysis.split.first.split.first.remainingCombinations, [[1]])
  assert.ok(analysis.split.second.remainingCombinations.every(combo => !combo.includes(1)))
  assert.ok(analysis.remainingCombinations.every(combo => combo.includes(1)))
})

test('parent eliminations constrain both subsections without marking them manually eliminated', () => {
  const source = {
    ...cage(10, 3),
    eliminatedCombos: findCombinations(10, 3).filter(combo => getComboKey(combo) !== '1-2-7').map(getComboKey),
  }
  const updated = split(source, source.id, 1, 1)
  const analysis = analyzeCage(updated)
  assert.deepEqual(analysis.split.second.remainingCombinations, [[2, 7]])
  assert.deepEqual(updated.split.second.eliminatedCombos, [])
})

test('subsection eliminations propagate across siblings and can be restored', () => {
  const updated = split(cage(), 'cage', 3, 15)
  const firstId = updated.split.first.id
  const before = analyzeCage(updated)
  const firstKeys = before.split.first.remainingCombinations.map(getComboKey)
  const eliminated = updateCageSection(updated, firstId, section => ({ ...section, eliminatedCombos: firstKeys }))
  const empty = analyzeCage(eliminated)
  assert.deepEqual(empty.remainingCombinations, [])
  assert.deepEqual(empty.split.first.remainingCombinations, [])
  assert.deepEqual(empty.split.second.remainingCombinations, [])
  const restored = updateCageSection(eliminated, firstId, section => ({ ...section, eliminatedCombos: [] }))
  assert.deepEqual(analyzeCage(restored).remainingCombinations, before.remainingCombinations)
})

test('splitting a subsection retains its previous eliminations and undo restores its state', () => {
  const initial = split(cage(), 'cage', 3, 15)
  const firstId = initial.split.first.id
  const eliminated = updateCageSection(initial, firstId, section => ({ ...section, eliminatedCombos: ['1-6-8'] }))
  const nested = split(eliminated, firstId, 1, 1)
  const analysis = analyzeCage(nested)
  assert.ok(!analysis.split.first.split.second.remainingCombinations.some(combo => getComboKey(combo) === '6-8'))
  const undone = updateCageSection(nested, firstId, section => ({ ...section, split: undefined }))
  assert.deepEqual(analyzeCage(undone).remainingCombinations, analyzeCage(eliminated).remainingCombinations)
  assert.deepEqual(undone.split.first.eliminatedCombos, ['1-6-8'])
})

test('invalid splits report errors without modifying the cage', () => {
  const source = cage()
  for (const [numCells, targetSum] of [[0, 15], [6, 15], [2.5, 15], [3, 15.5], [3, 5], [3, 30], [3, NaN]]) {
    const result = splitCageSection(source, source.id, { numCells, targetSum })
    assert.equal(result.ok, false)
    assert.ok(result.error.length > 0)
  }
  assert.equal(splitCageSection(cage(4, 2), 'cage', { numCells: 1, targetSum: 2 }).ok, false)
  assert.equal(splitCageSection(source, 'missing', { numCells: 3, targetSum: 15 }).ok, false)
  assert.equal(splitCageSection(cage(4, 1), 'cage', { numCells: 1, targetSum: 2 }).ok, false)
  assert.equal(source.split, undefined)
})

test('a split cannot contradict a parent elimination or overwrite an existing split', () => {
  const source = { ...cage(10, 3), eliminatedCombos: ['1-2-7', '1-3-6', '1-4-5'] }
  assert.equal(splitCageSection(source, source.id, { numCells: 1, targetSum: 1 }).ok, false)
  const updated = split(cage(), 'cage', 3, 15)
  assert.equal(splitCageSection(updated, updated.id, { numCells: 3, targetSum: 16 }).ok, false)
})

test('nested possibilities match complete distinct-digit assignments at every level', () => {
  const initial = split(cage(), 'cage', 3, 15)
  const nested = split(initial, initial.split.first.id, 1, 1)
  const source = updateCageSection(nested, nested.split.second.id, section => ({ ...section, eliminatedCombos: ['3-7-9'] }))

  function assignments(section) {
    const candidates = findCombinations(section.targetSum, section.numCells)
      .filter(combo => !section.eliminatedCombos.includes(getComboKey(combo)))
    if (!section.split) return candidates.map(digits => ({ digits, nodes: { [section.id]: digits } }))
    const matches = []
    for (const first of assignments(section.split.first)) {
      for (const second of assignments(section.split.second)) {
        const digits = [...first.digits, ...second.digits].sort((a, b) => a - b)
        if (new Set(digits).size !== digits.length) continue
        if (!candidates.some(combo => getComboKey(combo) === getComboKey(digits))) continue
        matches.push({ digits, nodes: { ...first.nodes, ...second.nodes, [section.id]: digits } })
      }
    }
    return matches
  }

  const complete = assignments(source)
  assert.ok(complete.length > 0)
  function check(analysis) {
    const expected = [...new Set(complete.map(assignment => getComboKey(assignment.nodes[analysis.section.id])))].sort()
    assert.deepEqual(analysis.remainingCombinations.map(getComboKey).sort(), expected)
    if (analysis.split) {
      check(analysis.split.first)
      check(analysis.split.second)
    }
  }
  check(analyzeCage(source))
})

test('evaluateSumExpression handles + and - and rejects anything else', () => {
  assert.equal(evaluateSumExpression('45-14-10-5'), 16)
  assert.equal(evaluateSumExpression(' 12 + 7 − 3 '), 16)
  assert.equal(evaluateSumExpression('24'), 24)
  assert.equal(evaluateSumExpression(''), null)
  assert.equal(evaluateSumExpression('45-'), null)
  assert.equal(evaluateSumExpression('4*5'), null)
})
