import { BOX_IDS } from '@/lib/killer-sudoku'
import { cn } from '@/lib/utils'

/**
 * The nine 3x3 boxes of the sudoku, laid out as they appear on the grid.
 * Tapping toggles a box; a cage that spans boxes just selects more than one.
 */
export function BoxPicker({ value, onChange, className }: {
  value: string[]
  onChange: (boxes: string[]) => void
  className?: string
}) {
  const toggle = (box: string) => {
    onChange(value.includes(box) ? value.filter(b => b !== box) : [...value, box])
  }

  return (
    <div className={cn('inline-grid grid-cols-3 gap-1.5 p-1.5 bg-muted/40 rounded-xl', className)}>
      {BOX_IDS.map(box => {
        const selected = value.includes(box)
        return (
          <button
            key={box}
            type="button"
            onClick={() => toggle(box)}
            aria-pressed={selected}
            aria-label={`Box ${box}`}
            className={cn(
              'w-14 h-14 rounded-lg text-sm font-bold tabular-nums transition-all border-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
            )}
          >
            {box}
          </button>
        )
      })}
    </div>
  )
}
