import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowsClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'

interface TilePosition {
  id: number
  x: number
  y: number
}

interface Cage {
  tiles: number[]
  sum: number
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

const TILE_SIZE = 64
const GROUPING_THRESHOLD = 100
const GRID_COLS = 3
const GRID_ROWS = 3
const GRID_GAP = 16

function getInitialPositions(): TilePosition[] {
  const positions: TilePosition[] = []
  for (let i = 1; i <= 9; i++) {
    const col = (i - 1) % GRID_COLS
    const row = Math.floor((i - 1) / GRID_COLS)
    positions.push({
      id: i,
      x: 40 + col * (TILE_SIZE + GRID_GAP),
      y: 40 + row * (TILE_SIZE + GRID_GAP),
    })
  }
  return positions
}

function findCages(positions: TilePosition[]): Cage[] {
  const visited = new Set<number>()
  const cages: Cage[] = []

  for (const pos of positions) {
    if (visited.has(pos.id)) continue

    const group: TilePosition[] = [pos]
    visited.add(pos.id)

    let i = 0
    while (i < group.length) {
      const current = group[i]
      for (const other of positions) {
        if (visited.has(other.id)) continue
        const dx = current.x - other.x
        const dy = current.y - other.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < GROUPING_THRESHOLD) {
          group.push(other)
          visited.add(other.id)
        }
      }
      i++
    }

    if (group.length > 1) {
      const tiles = group.map((t) => t.id)
      const sum = tiles.reduce((acc, id) => acc + id, 0)
      const xs = group.map((t) => t.x)
      const ys = group.map((t) => t.y)
      cages.push({
        tiles,
        sum,
        bounds: {
          minX: Math.min(...xs) - 8,
          minY: Math.min(...ys) - 8,
          maxX: Math.max(...xs) + TILE_SIZE + 8,
          maxY: Math.max(...ys) + TILE_SIZE + 8,
        },
      })
    }
  }

  return cages
}

function NumberTile({
  id,
  x,
  y,
  onDragEnd,
  constraintsRef,
}: {
  id: number
  x: number
  y: number
  onDragEnd: (id: number, x: number, y: number) => void
  constraintsRef: React.RefObject<HTMLDivElement | null>
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_, info) => {
        setIsDragging(false)
        const newX = x + info.offset.x
        const newY = y + info.offset.y
        onDragEnd(id, newX, newY)
      }}
      initial={false}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="absolute cursor-grab active:cursor-grabbing select-none"
      style={{ width: TILE_SIZE, height: TILE_SIZE, left: 0, top: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 1.1 }}
    >
      <div
        className={`w-full h-full rounded-xl flex items-center justify-center text-3xl font-bold transition-shadow duration-150 ${
          isDragging
            ? 'bg-primary text-primary-foreground shadow-2xl'
            : 'bg-card text-card-foreground shadow-lg hover:shadow-xl border border-border'
        }`}
      >
        {id}
      </div>
    </motion.div>
  )
}

function CageOverlay({ cage }: { cage: Cage }) {
  const width = cage.bounds.maxX - cage.bounds.minX
  const height = cage.bounds.maxY - cage.bounds.minY

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute pointer-events-none"
      style={{
        left: cage.bounds.minX,
        top: cage.bounds.minY,
        width,
        height,
      }}
    >
      <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium shadow-md whitespace-nowrap">
        Σ = {cage.sum}
      </div>
    </motion.div>
  )
}

export default function App() {
  const boardRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useKV<TilePosition[]>('tile-positions', getInitialPositions())
  const [cages, setCages] = useState<Cage[]>([])

  useEffect(() => {
    setCages(findCages(positions ?? []))
  }, [positions])

  const handleDragEnd = useCallback(
    (id: number, newX: number, newY: number) => {
      if (!boardRef.current) return

      const rect = boardRef.current.getBoundingClientRect()
      const maxX = rect.width - TILE_SIZE - 16
      const maxY = rect.height - TILE_SIZE - 16

      const clampedX = Math.max(16, Math.min(newX, maxX))
      const clampedY = Math.max(16, Math.min(newY, maxY))

      setPositions((prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, x: clampedX, y: clampedY } : p))
      )
    },
    [setPositions]
  )

  const handleReset = () => {
    setPositions(getInitialPositions())
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Killer Sudoku Helper
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag numbers together to see cage sums
            </p>
          </div>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <ArrowsClockwise weight="bold" />
            Reset
          </Button>
        </div>

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur">
          <div
            ref={boardRef}
            className="relative w-full h-[500px] md:h-[600px]"
            style={{
              backgroundImage: `
                radial-gradient(circle, oklch(0.85 0.01 250) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          >
            {cages.map((cage, i) => (
              <CageOverlay key={`cage-${i}-${cage.tiles.join('-')}`} cage={cage} />
            ))}

            {(positions ?? []).map((pos) => (
              <NumberTile
                key={pos.id}
                id={pos.id}
                x={pos.x}
                y={pos.y}
                onDragEnd={handleDragEnd}
                constraintsRef={boardRef}
              />
            ))}
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
            <div className="text-xl font-bold text-foreground">45</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Cages</div>
            <div className="text-xl font-bold text-foreground">{cages.length}</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Ungrouped</div>
            <div className="text-xl font-bold text-foreground">
              {9 - cages.reduce((acc, c) => acc + c.tiles.length, 0)}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Tip: Drag tiles close together to form cages. The sum appears automatically!</p>
        </div>
      </div>
    </div>
  )
}
