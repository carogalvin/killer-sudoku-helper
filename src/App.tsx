import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Pencil, Trash, CheckCircle, MagnifyingGlass, Stack, SquaresFour } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKV } from '@/hooks/use-kv'
import { toast } from 'sonner'
import { QuickLookup } from '@/components/QuickLookup'
import { BulkAdd } from '@/components/BulkAdd'
import { analyzeCombos, findCombinations, getComboKey, sortBoxes, type TrackedCage } from '@/lib/killer-sudoku'

function CageCard({ cage, onSelect, onDelete, onEditLabel, onEliminateCombo }: {
  cage: TrackedCage
  onSelect: () => void
  onDelete: () => void
  onEditLabel: (newLabel: string) => void
  onEliminateCombo: (comboKey: string) => void
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState(cage.label)

  const combinations = useMemo(() => findCombinations(cage.targetSum, cage.numCells), [cage.targetSum, cage.numCells])
  const remainingCombinations = useMemo(() => {
    return combinations.filter(combo => !cage.eliminatedCombos.includes(getComboKey(combo)))
  }, [combinations, cage.eliminatedCombos])
  const remainingCount = remainingCombinations.length
  const { alwaysPresent } = useMemo(() => analyzeCombos(remainingCombinations), [remainingCombinations])

  const handleSaveLabel = () => {
    if (labelInput.trim()) {
      onEditLabel(labelInput.trim())
    }
    setIsEditingLabel(false)
  }

  const handleComboClick = (e: React.MouseEvent, combo: number[]) => {
    e.stopPropagation()
    onEliminateCombo(getComboKey(combo))
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3 cursor-pointer" onClick={onSelect}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {isEditingLabel ? (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveLabel()
                      if (e.key === 'Escape') {
                        setLabelInput(cage.label)
                        setIsEditingLabel(false)
                      }
                    }}
                    onBlur={handleSaveLabel}
                    autoFocus
                    className="h-8"
                    placeholder="Cage label"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Tag weight="fill" size={16} className="text-primary flex-shrink-0" />
                  <CardTitle className="text-lg truncate">{cage.label}</CardTitle>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditingLabel(true)
                    }}
                    className="p-1 hover:bg-secondary rounded transition-colors flex-shrink-0"
                  >
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
            >
              <Trash weight="bold" size={18} className="text-destructive" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 cursor-pointer" onClick={onSelect}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{cage.targetSum}</div>
              <div className="text-xs text-muted-foreground">Sum</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{cage.numCells}</div>
              <div className="text-xs text-muted-foreground">Cells</div>
            </div>
            <div className="flex-1" />
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                remainingCount === 1 ? 'text-accent' :
                remainingCount === 0 ? 'text-destructive' :
                'text-foreground'
              }`}>
                {remainingCount}
              </div>
              <div className="text-xs text-muted-foreground">
                of {combinations.length} left
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Must be in this cage</div>
            {alwaysPresent.length > 0 ? (
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
            ) : (
              <div className={`text-sm ${remainingCount === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {remainingCount === 0 ? 'No possibilities remaining' : 'No guaranteed digits yet'}
              </div>
            )}
          </div>

          {remainingCount === 1 && (
            <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg border border-accent cursor-pointer" onClick={onSelect}>
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent-foreground">Only one combination left!</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Remaining possibilities (click to eliminate):</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {remainingCombinations.map((combo, idx) => (
                <button
                  key={idx}
                  onClick={(e) => handleComboClick(e, combo)}
                  className="w-full flex items-center gap-1.5 p-1.5 bg-secondary/50 hover:bg-destructive/10 rounded-lg transition-colors group"
                >
                  {combo.map((num, numIdx) => (
                    <span
                      key={numIdx}
                      className="w-7 h-7 flex items-center justify-center rounded bg-white border border-border text-sm font-bold shadow-sm group-hover:border-destructive/50 transition-colors"
                    >
                      {num}
                    </span>
                  ))}
                  <span className="ml-auto text-destructive opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm">
                    ✗
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CageDetailView({ cage, onBack, onUpdate }: {
  cage: TrackedCage
  onBack: () => void
  onUpdate: (updatedCage: TrackedCage) => void
}) {
  const combinations = useMemo(() => findCombinations(cage.targetSum, cage.numCells), [cage.targetSum, cage.numCells])

  const handleToggleCombo = (comboKey: string) => {
    const isEliminated = cage.eliminatedCombos.includes(comboKey)
    const updatedCage = {
      ...cage,
      eliminatedCombos: isEliminated
        ? cage.eliminatedCombos.filter(k => k !== comboKey)
        : [...cage.eliminatedCombos, comboKey],
    }
    onUpdate(updatedCage)
  }

  const remainingCount = combinations.length - cage.eliminatedCombos.length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Tag weight="fill" size={20} className="text-primary" />
          <h2 className="text-2xl font-bold">{cage.label}</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Target Sum</div>
                <div className="text-3xl font-bold text-primary">{cage.targetSum}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Number of Cells</div>
                <div className="text-3xl font-bold">{cage.numCells}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                remainingCount === 1 ? 'text-accent' :
                remainingCount === 0 ? 'text-destructive' :
                'text-foreground'
              }`}>
                {remainingCount}
              </div>
              <div className="text-sm text-muted-foreground">
                of {combinations.length} remaining
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Click combinations to eliminate or restore them
          </div>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {combinations.map((combo, idx) => {
              const comboKey = getComboKey(combo)
              const isEliminated = cage.eliminatedCombos.includes(comboKey)
              const leftovers = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !combo.includes(n))
              
              return (
                <motion.button
                  key={comboKey}
                  onClick={() => handleToggleCombo(comboKey)}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.01 }}
                  className={`w-full p-3 rounded-xl space-y-2 text-left transition-all ${
                    isEliminated
                      ? 'bg-muted/30 opacity-50 hover:opacity-70'
                      : 'bg-secondary hover:bg-secondary/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {combo.map((num, numIdx) => (
                      <span
                        key={numIdx}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold shadow-sm border transition-all ${
                          isEliminated
                            ? 'bg-muted border-muted-foreground/20 text-muted-foreground line-through'
                            : 'bg-white border-border'
                        }`}
                      >
                        {num}
                      </span>
                    ))}
                    <span className={`ml-auto text-sm font-medium ${
                      isEliminated ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'
                    }`}>
                      = {combo.reduce((a, b) => a + b, 0)}
                    </span>
                    {isEliminated && (
                      <span className="text-destructive font-bold">✗</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${isEliminated ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      Leftovers:
                    </span>
                    {leftovers.map((num, numIdx) => (
                      <span
                        key={numIdx}
                        className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${
                          isEliminated
                            ? 'bg-muted/30 text-muted-foreground/50'
                            : 'bg-muted/60 text-muted-foreground'
                        }`}
                      >
                        {num}
                      </span>
                    ))}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
export default function App() {
  const [trackedCages, setTrackedCages] = useKV<TrackedCage[]>('tracked-cages-v2', [])
  const [selectedCageId, setSelectedCageId] = useState<string | null>(null)
  const [tab, setTab] = useState('cages')

  const cages = useMemo(() => trackedCages ?? [], [trackedCages])
  const existingLabels = useMemo(() => cages.map(c => c.label), [cages])

  const selectedCage = useMemo(
    () => cages.find(c => c.id === selectedCageId),
    [cages, selectedCageId],
  )

  const createCage = ({ targetSum, numCells, boxes, label }: {
    targetSum: number
    numCells: number
    boxes: string[]
    label: string
  }): string => {
    const id = `cage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newCage: TrackedCage = {
      id,
      label,
      targetSum,
      numCells,
      eliminatedCombos: [],
      boxes: sortBoxes(boxes),
    }
    setTrackedCages(prev => [...(prev ?? []), newCage])
    return id
  }

  const handleDeleteCage = (cageId: string) => {
    const cage = cages.find(c => c.id === cageId)
    setTrackedCages(prev => (prev ?? []).filter(c => c.id !== cageId))
    if (selectedCageId === cageId) {
      setSelectedCageId(null)
    }
    if (cage) {
      toast.success(`Deleted "${cage.label}"`)
    }
  }

  const handleUpdateCage = (updatedCage: TrackedCage) => {
    setTrackedCages(prev => (prev ?? []).map(c => c.id === updatedCage.id ? updatedCage : c))
  }

  const handleEditLabel = (cageId: string, newLabel: string) => {
    setTrackedCages(prev => (prev ?? []).map(c => c.id === cageId ? { ...c, label: newLabel } : c))
  }

  const handleEliminateCombo = (cageId: string, comboKey: string) => {
    setTrackedCages(prev => (prev ?? []).map(c => {
      if (c.id === cageId) {
        return { ...c, eliminatedCombos: [...c.eliminatedCombos, comboKey] }
      }
      return c
    }))
  }

  if (selectedCage) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <CageDetailView
            cage={selectedCage}
            onBack={() => setSelectedCageId(null)}
            onUpdate={handleUpdateCage}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Killer Sudoku Helper
          </h1>
          <p className="text-muted-foreground mt-1">
            Look up combinations, then track the cages you want to whittle down
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:max-w-xl h-auto">
            <TabsTrigger value="lookup" className="gap-1.5 py-2">
              <MagnifyingGlass weight="bold" />
              Look up
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-1.5 py-2">
              <Stack weight="bold" />
              Bulk add
            </TabsTrigger>
            <TabsTrigger value="cages" className="gap-1.5 py-2">
              <SquaresFour weight="bold" />
              Cages
              {cages.length > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full bg-primary/15 text-primary text-xs font-bold tabular-nums">
                  {cages.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lookup">
            <QuickLookup
              existingLabels={existingLabels}
              onTrack={args => {
                createCage(args)
                toast.success(`Now tracking "${args.label}"`)
              }}
            />
          </TabsContent>

          <TabsContent value="bulk">
            <BulkAdd
              existingLabels={existingLabels}
              onAdd={createCage}
              onUndo={cageId =>
                setTrackedCages(prev => (prev ?? []).filter(c => c.id !== cageId))
              }
            />
          </TabsContent>

          <TabsContent value="cages">
            {cages.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center space-y-4">
                  <div className="space-y-1">
                    <div className="text-lg font-medium">No cages yet</div>
                    <div className="text-sm text-muted-foreground">
                      Add them in bulk, or track one from a lookup.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={() => setTab('bulk')} className="gap-2">
                      <Stack weight="bold" />
                      Bulk add cages
                    </Button>
                    <Button variant="outline" onClick={() => setTab('lookup')} className="gap-2">
                      <MagnifyingGlass weight="bold" />
                      Look up a sum
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {cages.map(cage => (
                    <CageCard
                      key={cage.id}
                      cage={cage}
                      onSelect={() => setSelectedCageId(cage.id)}
                      onDelete={() => handleDeleteCage(cage.id)}
                      onEditLabel={newLabel => handleEditLabel(cage.id, newLabel)}
                      onEliminateCombo={comboKey => handleEliminateCombo(cage.id, comboKey)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
