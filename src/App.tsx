import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowsClockwise, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'

interface TilePosition {
  id: string
  value: number
  x: number
  y: number
}

interface Cage {
  tiles: { id: string; value: number }[]
  sum: number
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

const TILE_SIZE = 64
const GROUPING_THRESHOLD = 100
const GRID_COLS = 3
const GRID_ROWS = 3
const GRID_GAP = 16

function createBlockPositions(blockIndex: number, startX: number, startY: number): TilePosition[] {
  const positions: TilePosition[] = []
  for (let i = 1; i <= 9; i++) {
    const col = (i - 1) % GRID_COLS
    const row = Math.floor((i - 1) / GRID_COLS)
    positions.push({
      id: `block-${blockIndex}-tile-${i}`,
      value: i,
      x: startX + col * (TILE_SIZE + GRID_GAP),
      y: startY + row * (TILE_SIZE + GRID_GAP),
    })
  }
  return positions
}

function getInitialPositions(): TilePosition[] {
  return createBlockPositions(0, 40, 40)
}

function findCages(positions: TilePosition[]): Cage[] {
  const visited = new Set<string>()
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
      const tiles = group.map((t) => ({ id: t.id, value: t.value }))
      const sum = tiles.reduce((acc, t) => acc + t.value, 0)
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
  value,
  x,
  y,
  onDragEnd,
  constraintsRef,
}: {
  id: string
  value: number
  x: number
  y: number
  onDragEnd: (id: string, x: number, y: number) => void
  constraintsRef: React.RefObject<HTMLDivElement | null>
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      animate={{ x: dragOffset.x, y: dragOffset.y }}
      transition={{ type: 'tween', duration: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDrag={(_, info) => {
        setDragOffset({ x: info.offset.x, y: info.offset.y })
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false)
        const newX = x + info.offset.x
        const newY = y + info.offset.y
        setDragOffset({ x: 0, y: 0 })
        onDragEnd(id, newX, newY)
      }}
      className="absolute cursor-grab active:cursor-grabbing select-none"
      style={{ 
        width: TILE_SIZE, 
        height: TILE_SIZE, 
        left: x, 
        top: y,
        zIndex: isDragging ? 50 : 10,
      }}
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
        {value}
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
  const [blockCount, setBlockCount] = useKV<number>('block-count', 1)
  const [cages, setCages] = useState<Cage[]>([])

  useEffect(() => {
    setCages(findCages(positions ?? []))
  }, [positions])

  const handlePositionUpdate = useCallback(
    (id: string, newX: number, newY: number) => {
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

  const handleAddBlock = useCallback(() => {
    const currentCount = blockCount ?? 1
    const col = currentCount % 3
    const row = Math.floor(currentCount / 3)
    const startX = 40 + col * (3 * (TILE_SIZE + GRID_GAP) + 40)
    const startY = 40 + row * (3 * (TILE_SIZE + GRID_GAP) + 40)
    
    const newPositions = createBlockPositions(currentCount, startX, startY)
    setPositions((prev) => [...(prev ?? []), ...newPositions])
    setBlockCount(currentCount + 1)
  }, [blockCount, setPositions, setBlockCount])

  const handleReset = () => {
    setPositions(getInitialPositions())
    setBlockCount(1)
  }

  const totalTiles = (positions ?? []).length
  const tilesInCages = cages.reduce((acc, c) => acc + c.tiles.length, 0)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Killer Sudoku Helper
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag numbers together to see cage sums
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={handleAddBlock} className="gap-2">
              <Plus weight="bold" />
              Add Block
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <ArrowsClockwise weight="bold" />
              Reset
            </Button>
          </div>
        </div>

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur">
          <div
            ref={boardRef}
            className="relative w-full h-[500px] md:h-[700px]"
            style={{
              backgroundImage: `
                radial-gradient(circle, oklch(0.85 0.01 250) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          >
            {cages.map((cage, i) => (
              <CageOverlay key={`cage-${i}-${cage.tiles.map(t => t.id).join('-')}`} cage={cage} />
            ))}

            {(positions ?? []).map((pos) => (
              <NumberTile
                key={pos.id}
                id={pos.id}
                value={pos.value}
                x={pos.x}
                y={pos.y}
                onDragEnd={handlePositionUpdate}
                constraintsRef={boardRef}
              />
            ))}
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Blocks</div>
            <div className="text-xl font-bold text-foreground">{blockCount ?? 1}</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Tiles</div>
            <div className="text-xl font-bold text-foreground">{totalTiles}</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Cages</div>
            <div className="text-xl font-bold text-foreground">{cages.length}</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Ungrouped</div>
            <div className="text-xl font-bold text-foreground">
              {totalTiles - tilesInCages}
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
