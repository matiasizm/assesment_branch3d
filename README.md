# Structural Beam Analysis Application

A web-based structural engineering tool for analyzing 2D beams using the Finite Element Method (FEM). This application allows engineers to model beams, apply loads, and visualize analysis results including deflection, shear force, bending moment diagrams, and support reactions.

**Note**: This project is an assessment for a senior backend engineer role.

## Features

- Interactive beam modeling with configurable length and material properties
- Multiple support types: Pin, Roller, and Fixed supports
- Various load types: Point loads, distributed loads, and point moments
- Load categorization: Dead (D) and Live (L) loads
- Real-time visualization of:
  - Deflection diagrams
  - Shear Force Diagrams (SFD)
  - Bending Moment Diagrams (BMD)
  - Support reactions

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Structural Analysis**: Custom FEM solver implementation
- **Development**: Frontend developed primarily using [Cursor](https://cursor.sh)

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Setup

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd assesment_branch3d
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start development server
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser

### Build

```bash
npm run build
npm run preview  # Preview production build
```

## Usage

1. Set beam length and material properties (E, I)
2. Add supports by selecting a type and clicking on the beam
3. Apply loads: select load type, magnitude, and category (Dead/Live)
4. Click "Solve" to run the analysis
5. View results in the bottom panel and switch between diagram types

## Architecture Design

This application follows **Pragmatic Clean Architecture** principles with clear separation of concerns between business logic and presentation layers.

1. Layered Architecture

The codebase is organized into three distinct layers:

src/
├── core/             # THE BRAIN: Pure TS, Framework-agnostic
│   ├── entities/     # Domain models (Node, Element, Load)
│   ├── logic/        # FEM Algorithms (StiffnessMatrix, Solver)
│   └── services/     # Business Services (Meshing, Load Processing)
├── presentation/     # THE FACE: React UI
│   ├── editor/       # Interactive Canvas & Inputs
│   ├── results/      # Visualization & Data Tables
│   └── hooks/        # State Controllers (useBeamAnalysis)
└── shared/           # Utilities & Types

2. Algorithmic Decision: Why FEM?

Instead of using analytical formulas (which are limited to simple, determinate beams), I implemented a Direct Stiffness Method solver.

    Scalability: It allows the system to solve indeterminate structures (continuous beams with N supports) without changing the codebase.

    Precision: It solves the system F=K⋅u, ensuring engineering-grade accuracy.

    Flexibility: It handles non-uniform segments and complex loading conditions natively.

    


### Layered Architecture

The codebase is organized into three main layers:

```
src/
├── core/           # Business logic layer (domain entities, FEM solver, services)
├── presentation/   # Presentation layer (UI components, hooks, workspace)
└── shared/         # Shared types and utilities
```

### Core Layer (`src/core/`)

The core layer contains all business logic and is completely independent of the UI framework:

- **Entities** (`core/entities/`): Domain models representing structural concepts
  - `Node.ts`: Represents beam nodes with support constraints
  - `Element.ts`: Represents beam elements with material properties (E, I)
  - `Load.ts`: Represents various load types (PointForce, DistributedForce, PointMoment) with load categories

- **Logic** (`core/logic/`): Core computational algorithms
  - `FemSolver.ts`: Finite Element Method solver implementing the structural analysis
  - `StiffnessMatrix.ts`: Generates element stiffness matrices using Bernoulli-Euler beam theory

- **Services** (`core/services/`): High-level business services
  - `BeamAnalysisService.ts`: Orchestrates mesh generation, load processing, and FEM analysis
  - `DiagramCalculator.ts`: Calculates shear force, bending moment, and deflection diagrams using the method of sections

### Presentation Layer (`src/presentation/`)

The presentation layer handles all UI concerns and user interactions:

- **Hooks** (`presentation/hooks/`): Custom React hooks managing application state
  - `useBeamAnalysis.ts`: Main state management hook that coordinates between UI and core services

- **Workspace** (`presentation/workspace/`): Main UI orchestration
  - `UnifiedWorkspace.tsx`: Main workspace component coordinating all UI elements
  - `InteractiveCanvas.tsx`: Interactive SVG canvas for beam visualization and editing

- **Results** (`presentation/results/`): Result visualization components
  - `IntegratedDiagrams.tsx`: Displays deflection, SFD, and BMD diagrams
  - `ReactionsDisplay.tsx`: Shows support reactions
  - `ResultsPanel.tsx`: Container for all result displays

- **Editor** (`presentation/editor/`): Beam editing components
  - `BeamEditor.tsx`: Beam configuration interface

### Design Patterns

1. **Service Layer Pattern**: Business logic is encapsulated in service classes (`BeamAnalysisService`, `DiagramCalculator`) that can be easily tested and reused

2. **Domain Model Pattern**: Core entities (`Node`, `Element`, `Load`) represent real-world structural engineering concepts with rich behavior

3. **Custom Hook Pattern**: `useBeamAnalysis` encapsulates complex state management and provides a clean interface to UI components

4. **Separation of Concerns**: 
   - FEM solver logic is isolated from diagram calculation
   - Diagram calculation is separate from visualization
   - UI components are pure presentation logic

5. **Dependency Inversion**: Core layer has no dependencies on presentation layer; presentation layer depends on core abstractions

### Data Flow

```
User Interaction (UI)
    ↓
useBeamAnalysis Hook (State Management)
    ↓
BeamAnalysisService (Orchestration)
    ↓
FemSolver (Core Algorithm)
    ↓
Analysis Results
    ↓
DiagramCalculator (Post-processing)
    ↓
UI Components (Visualization)
```

### Key Architectural Decisions

- **Pure TypeScript Core**: The core layer uses only TypeScript and math libraries, making it framework-agnostic and easily testable
- **React Hooks for State**: State management is handled through custom hooks, keeping components focused on rendering
- **Static Service Methods**: Core services use static methods, avoiding unnecessary instantiation and enabling functional programming patterns
- **Type Safety**: Extensive use of TypeScript types ensures compile-time safety across layers

## Project Structure

```
src/
├── core/           # Business logic (entities, FEM solver, services)
│   ├── entities/   # Domain models (Node, Element, Load)
│   ├── logic/      # Core algorithms (FemSolver, StiffnessMatrix)
│   └── services/   # Business services (BeamAnalysisService, DiagramCalculator)
├── presentation/   # UI components (editor, results, workspace)
│   ├── hooks/      # Custom React hooks (useBeamAnalysis)
│   ├── workspace/  # Main workspace components
│   ├── results/    # Result visualization components
│   └── editor/     # Beam editing components
└── shared/         # Shared types and utilities
```

## Future Improvements

Due to time constraints, the following features were not implemented but are planned for future development:

- **Beams with different y positions**: Support for multi-level beam structures
- **Superposition of forces**: Ability to combine Dead and Live load effects
- **Load combinations**: Support for standard load combination cases (e.g., 1.2D + 1.6L)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
