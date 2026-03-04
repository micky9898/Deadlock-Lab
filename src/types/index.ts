// ─── Core data types ────────────────────────────────────────────────────────

/** A single resource request from a process */
export interface ResourceRequest {
    pid: number;
    vector: number[]; // length M
    id: string;       // unique id for queuing
}

/** Enum of supported algorithms */
export type AlgorithmType = 'bankers' | 'detection';

/** State of the entire simulation */
export interface SimulationState {
    n: number;           // number of processes
    m: number;           // number of resource types
    total: number[];     // total resources [M]
    max: number[][];     // max demand [N][M]
    alloc: number[][];   // current allocation [N][M]
    available: number[]; // computed: total - sum(alloc)
    need: number[][];    // computed: max - alloc
}

/** One step in the simulation log */
export interface SimStep {
    id: string;
    timestamp: string;
    phase: 'validate' | 'tentative' | 'safety' | 'commit' | 'rollback' | 'detection' | 'info';
    message: string;
    details?: Record<string, unknown>;
}

/** Result of the Banker's Algorithm */
export interface BankersResult {
    granted: boolean;
    safeSequence?: number[];
    reason?: string;
    newAlloc?: number[][];
    newAvailable?: number[];
    steps: SimStep[];
}

/** An edge in the Wait-For graph */
export interface WFGEdge {
    from: number; // waiting process
    to: number;   // holding process
    resourceIdx: number;
}

/** Result of deadlock detection */
export interface DetectionResult {
    deadlocked: boolean;
    deadlockedProcesses: number[];
    cyclePaths: number[][];
    adjacencyList: Map<number, number[]>;
    steps: SimStep[];
}

/** Preset scenario */
export interface Scenario {
    name: string;
    description: string;
    n: number;
    m: number;
    total: number[];
    max: number[][];
    alloc: number[][];
    sampleRequests: ResourceRequest[];
    /** True for the special "Custom" blank-slate entry */
    isCustom?: boolean;
}

/** UI state for step-through simulation */
export interface StepPlayback {
    steps: SimStep[];
    currentIndex: number;
    isPlaying: boolean;
    speed: number; // ms between steps
}

/** Validation error */
export interface ValidationError {
    field: string;
    message: string;
}
