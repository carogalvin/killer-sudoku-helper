import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  analyzeCombos,
  getComboKey,
  splitCageSection,
  updateCageSection,
  type CageAnalysis,
  type CageSection,
  type TrackedCage,
} from '@/lib/killer-sudoku'

export function CageDigitSummary({ combinations, scope = 'cage' }: { combinations: number[][]; scope?: 'cage' | 'section' }) {
  const { alwaysPresent, neverPresent } = analyzeCombos(combinations)
  if (combinations.length === 0 || (alwaysPresent.length === 0 && neverPresent.length === 0)) return null

  return (
    <div className="space-y-3">
      {alwaysPresent.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Must be in this {scope}</div>
          <div className="flex flex-wrap gap-1.5">
            {alwaysPresent.map(digit => (
              <span
                key={digit}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border shadow-sm tabular-nums bg-accent/15 border-accent text-accent-foreground"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      )}
      {neverPresent.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">Can't be in this {scope}</div>
          <div className="flex flex-wrap gap-1.5">
            {neverPresent.map(digit => (
              <span
                key={digit}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border shadow-sm tabular-nums bg-muted/60 border-transparent text-muted-foreground/60 line-through"
              >
                {digit}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CageCombinationList({ combinations, onToggle, eliminated = false }: {
  combinations: number[][]
  onToggle: (comboKey: string) => void
  eliminated?: boolean
}) {
  return (
    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
      {combinations.map(combo => (
        <button
          key={getComboKey(combo)}
          type="button"
          aria-label={`${eliminated ? 'Restore' : 'Eliminate'} combination ${combo.join(', ')}`}
          onClick={() => onToggle(getComboKey(combo))}
          className={`w-full flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg transition-colors group ${
            eliminated ? 'bg-muted/30 hover:bg-accent/10' : 'bg-secondary/50 hover:bg-destructive/10'
          }`}
        >
          {combo.map(digit => (
            <span
              key={digit}
              className={`w-7 h-7 flex items-center justify-center rounded border text-sm font-bold shadow-sm ${
                eliminated
                  ? 'bg-muted text-muted-foreground line-through border-muted-foreground/20'
                  : 'bg-white border-border group-hover:border-destructive/50'
              }`}
            >
              {digit}
            </span>
          ))}
          <span aria-hidden="true" className={`ml-auto font-bold text-sm ${eliminated ? 'text-accent' : 'text-destructive opacity-0 group-hover:opacity-100 transition-opacity'}`}>
            {eliminated ? '+' : '✗'}
          </span>
        </button>
      ))}
    </div>
  )
}

export function CageSplitControls({ cage, section, label, onUpdate }: {
  cage: TrackedCage
  section: CageSection
  label?: string
  onUpdate: (cage: TrackedCage) => void
}) {
  const formId = useId()
  const [isSplitting, setIsSplitting] = useState(false)
  const [cellsInput, setCellsInput] = useState(String(Math.floor(section.numCells / 2)))
  const [sumInput, setSumInput] = useState('')
  const [error, setError] = useState('')

  const numCells = Number(cellsInput)
  const targetSum = Number(sumInput)
  const canPreview = cellsInput.trim() !== '' && sumInput.trim() !== ''
    && Number.isInteger(numCells) && numCells > 0 && numCells < section.numCells
    && Number.isInteger(targetSum)
  const title = label ? `Split section ${label}` : 'Split cage'

  const reset = () => {
    setIsSplitting(false)
    setCellsInput(String(Math.floor(section.numCells / 2)))
    setSumInput('')
    setError('')
  }

  if (section.split) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={label ? `Undo split of section ${label}` : 'Undo cage split'}
        onClick={() => onUpdate(updateCageSection(cage, section.id, current => ({ ...current, split: undefined })))}
      >
        Undo split
      </Button>
    )
  }

  if (section.numCells < 2) return null

  if (!isSplitting) {
    return (
      <Button type="button" size="sm" variant="outline" aria-label={title} onClick={() => setIsSplitting(true)}>
        {label ? 'Split section' : 'Split cage'}
      </Button>
    )
  }

  return (
    <form
      aria-label={title}
      noValidate
      className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3"
      onSubmit={event => {
        event.preventDefault()
        const result = splitCageSection(cage, section.id, { numCells, targetSum })
        if (!result.ok) {
          setError(result.error)
          return
        }
        onUpdate(result.cage)
        reset()
      }}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${formId}-cells`} className="text-xs font-medium">Cells</label>
          <Input
            id={`${formId}-cells`}
            type="number"
            inputMode="numeric"
            min={1}
            max={section.numCells - 1}
            step={1}
            value={cellsInput}
            aria-describedby={error ? `${formId}-error` : undefined}
            onChange={event => { setCellsInput(event.target.value); setError('') }}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${formId}-sum`} className="text-xs font-medium">Sum</label>
          <Input
            id={`${formId}-sum`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={sumInput}
            placeholder="e.g. 15"
            autoFocus
            aria-describedby={error ? `${formId}-error` : undefined}
            onChange={event => { setSumInput(event.target.value); setError('') }}
          />
        </div>
      </div>
      <div className="text-xs text-muted-foreground" aria-live="polite">
        {canPreview
          ? `Remaining subsection: ${section.numCells - numCells} ${section.numCells - numCells === 1 ? 'cell' : 'cells'}, sum ${section.targetSum - targetSum}`
          : 'Enter one subsection. The remaining cells and sum are calculated automatically.'}
      </div>
      {error && <div id={`${formId}-error`} role="alert" className="text-sm text-destructive">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">Create split</Button>
        <Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button>
      </div>
    </form>
  )
}

function Subsection({ cage, analysis, label, onUpdate }: {
  cage: TrackedCage
  analysis: CageAnalysis
  label: string
  onUpdate: (cage: TrackedCage) => void
}) {
  const { section, remainingCombinations } = analysis
  const eliminated = analysis.combinations.filter(combo => section.eliminatedCombos.includes(getComboKey(combo)))

  const toggleCombination = (comboKey: string) => {
    onUpdate(updateCageSection(cage, section.id, current => ({
      ...current,
      eliminatedCombos: current.eliminatedCombos.includes(comboKey)
        ? current.eliminatedCombos.filter(key => key !== comboKey)
        : [...current.eliminatedCombos, comboKey],
    })))
  }

  return (
    <section aria-label={`Section ${label}`} className={analysis.split ? 'space-y-3' : 'space-y-3 rounded-xl border border-border p-3'}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Section {label}</h3>
          <div className="text-xs text-muted-foreground">
            {section.numCells} {section.numCells === 1 ? 'cell' : 'cells'}, sum <span className="font-bold text-primary">{section.targetSum}</span>
          </div>
        </div>
        <div className={`text-xs font-medium ${remainingCombinations.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {remainingCombinations.length} left
        </div>
      </div>
      <CageSplitControls cage={cage} section={section} label={label} onUpdate={onUpdate} />
      {analysis.split ? (
        <>
          <Subsection cage={cage} analysis={analysis.split.first} label={`${label}.1`} onUpdate={onUpdate} />
          <Subsection cage={cage} analysis={analysis.split.second} label={`${label}.2`} onUpdate={onUpdate} />
        </>
      ) : (
        <>
          <CageDigitSummary combinations={remainingCombinations} scope="section" />
          {remainingCombinations.length === 0 ? (
            <div className="text-sm text-destructive">No possibilities remaining</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Possibilities (click to eliminate):</div>
              <CageCombinationList combinations={remainingCombinations} onToggle={toggleCombination} />
            </div>
          )}
        </>
      )}
      {eliminated.length > 0 && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Eliminated ({eliminated.length}) - click a combination to restore
          </summary>
          <CageCombinationList combinations={eliminated} onToggle={toggleCombination} eliminated />
        </details>
      )}
    </section>
  )
}

export function CageSubsections({ cage, split, onUpdate }: {
  cage: TrackedCage
  split: NonNullable<CageAnalysis['split']>
  onUpdate: (cage: TrackedCage) => void
}) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <Subsection cage={cage} analysis={split.first} label="A" onUpdate={onUpdate} />
      <Subsection cage={cage} analysis={split.second} label="B" onUpdate={onUpdate} />
    </div>
  )
}
