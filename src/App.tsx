import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Tag, Pencil, Trash, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface TrackedCage {
  id: string
  label: string
  targetSum: number
  numCells: number
  eliminatedCombos: string[]
}

function findCombinations(targetSum: number, numCells: number): number[][] {
  const availableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const results: number[][] = []

  function backtrack(start: number, currentCombo: number[], currentSum: number) {
    if (currentCombo.length === numCells) {
      if (currentSum === targetSum) {
        results.push([...currentCombo])
      }
      return
    }

    if (currentSum >= targetSum) return
    if (currentCombo.length + (availableNumbers.length - start) < numCells) return

    for (let i = start; i < availableNumbers.length; i++) {
      const num = availableNumbers[i]
      currentCombo.push(num)
      backtrack(i + 1, currentCombo, currentSum + num)
      currentCombo.pop()
    }
  }

  backtrack(0, [], 0)
  return results
}

function getComboKey(combo: number[]): string {
  return combo.join('-')
}

function CageCard({ cage, onSelect, onDelete, onEditLabel }: {
  cage: TrackedCage
  onSelect: () => void
  onDelete: () => void
  onEditLabel: (newLabel: string) => void
}) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState(cage.label)

  const combinations = useMemo(() => findCombinations(cage.targetSum, cage.numCells), [cage.targetSum, cage.numCells])
  const remainingCombinations = useMemo(() => {
    return combinations.filter(combo => !cage.eliminatedCombos.includes(getComboKey(combo)))
  }, [combinations, cage.eliminatedCombos])
  const remainingCount = remainingCombinations.length

  const handleSaveLabel = () => {
    if (labelInput.trim()) {
      onEditLabel(labelInput.trim())
    }
    setIsEditingLabel(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onSelect}>
        <CardHeader className="pb-3">
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
          <div className="flex items-center gap-4">
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
          
          {remainingCount === 1 && (
            <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg border border-accent">
              <CheckCircle weight="fill" size={16} className="text-accent" />
              <span className="text-sm font-medium text-accent-foreground">Only one combination left!</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Remaining possibilities:</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {remainingCombinations.map((combo, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1.5 bg-secondary/50 rounded-lg"
                >
                  {combo.map((num, numIdx) => (
                    <span
                      key={numIdx}
                      className="w-7 h-7 flex items-center justify-center rounded bg-white border border-border text-sm font-bold shadow-sm"
                    >
                      {num}
                    </span>
                  ))}
                </div>
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
  const [isAddingCage, setIsAddingCage] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newSum, setNewSum] = useState('')
  const [newCells, setNewCells] = useState('2')

  const selectedCage = useMemo(() => {
    return (trackedCages ?? []).find(c => c.id === selectedCageId)
  }, [trackedCages, selectedCageId])

  const handleAddCage = () => {
    const sum = parseInt(newSum)
    const cells = parseInt(newCells)
    
    if (!newLabel.trim()) {
      toast.error('Please enter a label')
      return
    }
    
    if (isNaN(sum) || sum < 1 || sum > 45) {
      toast.error('Sum must be between 1 and 45')
      return
    }
    
    if (isNaN(cells) || cells < 2 || cells > 9) {
      toast.error('Cells must be between 2 and 9')
      return
    }

    const combinations = findCombinations(sum, cells)
    if (combinations.length === 0) {
      toast.error('No valid combinations exist for this sum and cell count')
      return
    }

    const newCage: TrackedCage = {
      id: `cage-${Date.now()}`,
      label: newLabel.trim(),
      targetSum: sum,
      numCells: cells,
      eliminatedCombos: [],
    }

    setTrackedCages(prev => [...(prev ?? []), newCage])
    toast.success(`Added cage "${newLabel}"`)
    
    setNewLabel('')
    setNewSum('')
    setNewCells('2')
    setIsAddingCage(false)
  }

  const handleDeleteCage = (cageId: string) => {
    const cage = (trackedCages ?? []).find(c => c.id === cageId)
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Killer Sudoku Solver
            </h1>
            <p className="text-muted-foreground mt-1">
              Track cages and eliminate possibilities as you solve
            </p>
          </div>
          <Button onClick={() => setIsAddingCage(true)} className="gap-2" size="lg">
            <Plus weight="bold" />
            Add Cage
          </Button>
        </div>

        <AnimatePresence>
          {isAddingCage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus weight="bold" className="text-primary" />
                    Add New Cage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Label
                      </label>
                      <Input
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="e.g., Block 1.1, Top-left cage"
                        id="cage-label"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCage()
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Target Sum
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="45"
                        value={newSum}
                        onChange={(e) => setNewSum(e.target.value)}
                        placeholder="e.g., 17"
                        id="cage-sum"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCage()
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Cells
                      </label>
                      <Input
                        type="number"
                        min="2"
                        max="9"
                        value={newCells}
                        onChange={(e) => setNewCells(e.target.value)}
                        id="cage-cells"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCage()
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={handleAddCage} className="gap-2">
                      <Plus weight="bold" />
                      Add Cage
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setIsAddingCage(false)
                      setNewLabel('')
                      setNewSum('')
                      setNewCells('2')
                    }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {(trackedCages ?? []).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="text-muted-foreground space-y-2">
                <div className="text-lg font-medium">No cages yet</div>
                <div className="text-sm">Click "Add Cage" to start tracking combinations</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {(trackedCages ?? []).map(cage => (
                <CageCard
                  key={cage.id}
                  cage={cage}
                  onSelect={() => setSelectedCageId(cage.id)}
                  onDelete={() => handleDeleteCage(cage.id)}
                  onEditLabel={(newLabel) => handleEditLabel(cage.id, newLabel)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
