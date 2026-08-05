import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MagnifyingGlass, Plus, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BoxPicker } from '@/components/BoxPicker'
import { analyzeCombos, buildCageLabel, findCombinations, sumBounds } from '@/lib/killer-sudoku'
import { cn } from '@/lib/utils'

const CELL_CHOICES = [2, 3, 4, 5, 6, 7, 8, 9]

function DigitChip({ digit, tone }: { digit: number; tone: 'default' | 'always' | 'never' }) {
  return (
    <span
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border shadow-sm tabular-nums',
        tone === 'default' && 'bg-white border-border',
        tone === 'always' && 'bg-accent/15 border-accent text-accent-foreground',
        tone === 'never' && 'bg-muted/60 border-transparent text-muted-foreground/60 line-through',
      )}
    >
      {digit}
    </span>
  )
}

/**
 * Step 2 of the solving flow: check a cage's possibilities without committing to
 * tracking it. Only if it's worth following does it become a real cage.
 */
export function QuickLookup({ existingLabels, onTrack }: {
  existingLabels: string[]
  onTrack: (args: { targetSum: number; numCells: number; boxes: string[]; label: string }) => void
}) {
  const [sumInput, setSumInput] = useState('')
  const [numCells, setNumCells] = useState(2)
  const [isTracking, setIsTracking] = useState(false)
  const [boxes, setBoxes] = useState<string[]>([])

  const targetSum = Number.parseInt(sumInput, 10)
  const hasSum = Number.isFinite(targetSum)
  const bounds = sumBounds(numCells)
  const inRange = hasSum && targetSum >= bounds.min && targetSum <= bounds.max

  const analysis = useMemo(
    () => (inRange ? analyzeCombos(findCombinations(targetSum, numCells)) : null),
    [inRange, targetSum, numCells],
  )

  const previewLabel = useMemo(
    () => (inRange ? buildCageLabel(boxes, targetSum, existingLabels) : ''),
    [inRange, boxes, targetSum, existingLabels],
  )

  const reset = () => {
    setSumInput('')
    setIsTracking(false)
    setBoxes([])
  }

  const handleTrack = () => {
    if (!inRange) return
    onTrack({ targetSum, numCells, boxes, label: previewLabel })
    reset()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="lookup-sum" className="block text-sm font-medium">
              Sum
            </label>
            <Input
              id="lookup-sum"
              type="number"
              inputMode="numeric"
              autoFocus
              value={sumInput}
              onChange={e => setSumInput(e.target.value)}
              placeholder="e.g. 24"
              className="h-14 text-2xl font-bold tabular-nums"
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

          {hasSum && !inRange && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/40">
              <Warning weight="fill" size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Not possible.</span>{' '}
                {numCells} cells must add up to between {bounds.min} and {bounds.max}.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className={cn(analysis.combos.length === 1 && 'border-accent')}>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    'text-5xl font-bold tabular-nums',
                    analysis.combos.length === 1 ? 'text-accent' : 'text-primary',
                  )}
                >
                  {analysis.combos.length}
                </span>
                <span className="text-muted-foreground">
                  {analysis.combos.length === 1
                    ? 'combination — it can only be this'
                    : 'possible combinations'}
                </span>
              </div>

              {(analysis.alwaysPresent.length > 0 || analysis.neverPresent.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {analysis.alwaysPresent.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        Always in this cage
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.alwaysPresent.map(d => (
                          <DigitChip key={d} digit={d} tone="always" />
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.neverPresent.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">
                        Never in this cage
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.neverPresent.map(d => (
                          <DigitChip key={d} digit={d} tone="never" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Combinations</div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {analysis.combos.map(combo => (
                    <div
                      key={combo.join('-')}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg bg-secondary/50"
                    >
                      {combo.map(d => (
                        <DigitChip key={d} digit={d} tone="default" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {isTracking ? (
            <Card className="border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <span className="block text-sm font-medium">
                    Which box is it in?{' '}
                    <span className="font-normal text-muted-foreground">
                      Pick more than one if the cage spans boxes.
                    </span>
                  </span>
                  <BoxPicker value={boxes} onChange={setBoxes} />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <code className="px-2 py-1 rounded bg-secondary font-bold tabular-nums">
                    {previewLabel}
                  </code>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleTrack} className="gap-2">
                    <Plus weight="bold" />
                    Track it
                  </Button>
                  <Button variant="outline" onClick={() => setIsTracking(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => setIsTracking(true)}>
              <Plus weight="bold" />
              Track this cage
            </Button>
          )}
        </motion.div>
      )}

      {!hasSum && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <MagnifyingGlass size={32} />
          <p className="text-sm">Enter a sum to see every combination.</p>
        </div>
      )}
    </div>
  )
}
