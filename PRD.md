# Killer Sudoku Cage Calculator

A visual whiteboard tool for solving Killer Sudoku puzzles by experimenting with number groupings and their sums.

**Experience Qualities**:
1. **Tactile** - Dragging numbers should feel smooth and responsive, like moving physical tiles
2. **Immediate** - Sum calculations update instantly as numbers are grouped or separated
3. **Focused** - Minimal UI that keeps attention on the number manipulation task

**Complexity Level**: Light Application (multiple features with basic state)
- The app has draggable elements, automatic grouping detection, and sum calculation, but remains single-purpose

## Essential Features

### Draggable Number Tiles (1-9)
- **Functionality**: Nine tiles representing digits 1-9 that can be freely dragged around a whiteboard
- **Purpose**: Allows experimentation with different number combinations for cage solving
- **Trigger**: Click/touch and drag on any number tile
- **Progression**: User clicks tile → drags to new position → releases → tile stays in place
- **Success criteria**: Tiles move smoothly, maintain position after release

### Automatic Cage Detection & Sum Display
- **Functionality**: When tiles are positioned close together, they form a "cage" and display their sum
- **Purpose**: Instantly shows the sum of grouped numbers without manual calculation
- **Trigger**: Tiles within proximity threshold automatically group
- **Progression**: Drag tile near others → visual cage forms around group → sum appears above cage
- **Success criteria**: Groups form/dissolve correctly, sums are accurate

### Reset/Scatter Function
- **Functionality**: Button to reset all tiles to starting positions
- **Purpose**: Quick way to start fresh with a new cage combination
- **Trigger**: Click reset button
- **Progression**: Click button → tiles animate back to default positions
- **Success criteria**: All tiles return to organized starting layout

## Edge Case Handling

- **Overlapping tiles**: Tiles snap to avoid exact overlap, maintaining visibility
- **Edge of canvas**: Tiles constrained within whiteboard boundaries
- **Single tile**: Solo tiles show no sum (or show their own value as "1 tile")
- **All tiles grouped**: Shows sum of 45 (1+2+...+9)

## Design Direction
The design should feel like a clean, modern puzzle workspace - think graph paper meets digital whiteboard. Calm and focused with subtle depth on interactive elements.

## Color Selection
- **Primary Color**: `oklch(0.55 0.15 250)` - Deep blue for interactive elements, communicates focus and precision
- **Secondary Colors**: `oklch(0.96 0.01 250)` - Soft blue-gray for backgrounds, creates calm workspace feel
- **Accent Color**: `oklch(0.75 0.15 150)` - Mint green for sum displays and success states
- **Foreground/Background Pairings**:
  - Background (`oklch(0.97 0.005 250)`): Foreground (`oklch(0.25 0.02 250)`) - Ratio 10:1 ✓
  - Primary (`oklch(0.55 0.15 250)`): White text (`oklch(1 0 0)`) - Ratio 5.2:1 ✓
  - Accent (`oklch(0.75 0.15 150)`): Dark text (`oklch(0.25 0.02 250)`) - Ratio 6.8:1 ✓

## Font Selection
Clean, geometric typeface that echoes the mathematical nature of Sudoku while remaining highly legible at various sizes.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold/24px/tight letter spacing
  - Number Tiles: Space Grotesk Bold/32px/normal
  - Sum Display: Space Grotesk Medium/20px/normal
  - Helper Text: Space Grotesk Regular/14px/normal

## Animations
Smooth, physics-based animations that make interactions feel tangible - tiles should have subtle shadows that respond to drag state, and cages should fade in/out gracefully when groups form or dissolve.

## Component Selection

- **Components**:
  - Button (shadcn) - Reset button with ghost variant
  - Card (shadcn) - Container for the whiteboard area with subtle shadow
  - Tooltip (shadcn) - For explaining cage mechanics on hover
  
- **Customizations**:
  - NumberTile - Custom draggable component with framer-motion
  - CageOverlay - Custom SVG/div that draws around grouped tiles
  - SumBadge - Floating badge showing group sum

- **States**:
  - Tiles: default (raised shadow), hover (slight lift), dragging (larger shadow, slight scale), grouped (connected visual)
  - Reset button: default, hover (slight color shift)

- **Icon Selection**: ArrowsClockwise (Phosphor) for reset

- **Spacing**: 
  - Whiteboard padding: 24px (p-6)
  - Tile size: 64x64px
  - Grouping threshold: ~80px proximity

- **Mobile**: 
  - Touch-friendly tile sizes (minimum 48px)
  - Full-width whiteboard
  - Bottom-positioned controls
