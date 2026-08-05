import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUUpLeft, Plus, Stack, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BoxPicker } from '@/components/BoxPicker'
import { buildCageLabel, findCombinations, sumBounds } from '@/lib/killer-sudoku'
import { cn } from '@/lib/utils'

const CELL_CHOICES = [2, 3, 4, 5, 6, 7, 8, 9]

/**
 * Step 3 of the solving flow: work box by box entering the remaining cages.
 * The box selection is deliberately sticky and names are generated, so adding a
 * cage is just sum, cells, Enter.
 */
export function BulkAdd({ existingLabels, onAdd, onUndo }: {
  existingLabels: string[]
  /** Creates the cage and returns its id, so a mistaken entry can be undone. */
  onAdd: (args: { targetSum: number; numCells: number; boxes: string[]; label: string }) => string
  onUndo: (cageId: string) => void
}) {
  const [boxes, setBoxes] = useState<string[]>([])
  const [sumInput, setSumInput] = useState('')
  const [numCells, setNumCells] = useState(2)
  const [added, setAdded] = useState<{ id: string; label: string }[]>([])
  const sumRef = useRef<HTMLInputElement>(null)

  const targetSum = Number.parseInt(sumInput, 10)
  const hasSum = Number.isFinite(targetSum)
  const bounds = sumBounds(numCells)
  const inRange = hasSum && targetSum >= bounds.min && targetSum <= bounds.max

  const comboCount = useMemo(
    () => (inRange ? findCombinations(targetSum, numCells).length : 0),
    [inRange, targetSum, numCells],
  )

  const previewLabel = useMemo(
    () => (inRange ? buildCageLabel(boxes, targetSum, existingLabels) : ''),
    [inRange, boxes, targetSum, existingLabels],
  )

  const canAdd = inRange && boxes.length > 0

  const handleAdd = () => {
    if (!canAdd) return
    const id = onAdd({ targetSum, numCells, boxes, label: previewLabel })
    setAdded(prev => [{ id, label: previewLabel }, ...prev])
    // Keep the box and cell count so the next cage in this box is just a number.
    setSumInput('')
    sumRef.current?.focus()
  }

  const handleUndo = (id: string) => {
    onUndo(id)
    setAdded(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <span className="block text-sm font-medium">
              Box{' '}
              <span className="font-normal text-muted-foreground">
                stays selected, so you can work through one box at a time
              </span>
            </span>
            <BoxPicker value={boxes} onChange={setBoxes} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="space-y-2">
              <label htmlFor="bulk-sum" className="block text-sm font-medium">
                Sum
              </label>
              <Input
                id="bulk-sum"
                ref={sumRef}
                type="number"
                inputMode="numeric"
                value={sumInput}
                onChange={e => setSumInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd()
                }}
                placeholder="24"
                className="h-14 w-full sm:w-32 text-2xl font-bold tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium">Cells</span>
              <div className="flex flex-wrap gap-1.5">
                {CELL_CHOICES.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumCells(n)}
                    aria-pressed={n === numCells}
                    className={cn(
                      'w-11 h-11 rounded-lg font-bold tabular-nums border-2 transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      n === numCells
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-white border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {hasSum && !inRange && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/40">
              <Warning weight="fill" size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Not possible.</span>{' '}
                {numCells} cells must add up to between {bounds.min} and {bounds.max}.
              </div>
            </div>
          )}

          {inRange && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Name:</span>
                <code className="px-2 py-1 rounded bg-secondary font-bold tabular-nums">
                  {boxes.length > 0 ? previewLabel : 'pick a box first'}
                </code>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5',
                  comboCount === 1 ? 'text-accent font-medium' : 'text-muted-foreground',
                )}
              >
                <span className="font-bold tabular-nums">{comboCount}</span>
                <span>{comboCount === 1 ? 'combination — solved!' : 'combinations'}</span>
              </div>
            </div>
          )}

          <Button onClick={handleAdd} disabled={!canAdd} className="w-full gap-2" size="lg">
            <Plus weight="bold" />
            Add cage
          </Button>
        </CardContent>
      </Card>

      {added.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="text-sm font-medium">
              Added just now{' '}
              <span className="font-normal text-muted-foreground">({added.length})</span>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {added.map(entry => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50"
                  >
                    <code className="font-bold text-sm tabular-nums">{entry.label}</code>
                    <button
                      type="button"
                      onClick={() => handleUndo(entry.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <ArrowUUpLeft size={14} />
                      Undo
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {added.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Stack size={32} />
          <p className="text-sm text-center max-w-xs">
            Pick a box, then add each cage with just its sum and cell count. Names are generated
            for you.
          </p>
        </div>
      )}
    </div>
  )
}
