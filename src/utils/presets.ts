/**
 * presets.ts — Sample scenarios for testing and demonstration
 */
import type { ResourceRequest, Scenario } from '../types';

function reqId(): string {
    return `req-${Math.random().toString(36).slice(2, 8)}`;
}

export const SCENARIOS: Scenario[] = [
    // ── 1. Classic safe (textbook example) ──────────────────────────────────
    {
        name: 'Classic Safe (Textbook)',
        description: 'N=3, M=3 — Request by P1 leads to safe state. Classic Banker\'s example.',
        n: 3,
        m: 3,
        total: [10, 5, 7],
        max: [
            [7, 5, 3],
            [3, 2, 2],
            [9, 0, 2],
        ],
        alloc: [
            [0, 1, 0],
            [2, 0, 0],
            [3, 0, 2],
        ],
        sampleRequests: [
            { id: reqId(), pid: 1, vector: [1, 0, 2] },
        ],
    },

    // ── 2. Medium complexity ─────────────────────────────────────────────────
    {
        name: 'Medium — Multiple Processes',
        description: 'N=5, M=3 — Mix of safe and unsafe requests. Good for step-through exploration.',
        n: 5,
        m: 3,
        total: [10, 5, 7],
        max: [
            [7, 5, 3],
            [3, 2, 2],
            [9, 0, 2],
            [2, 2, 2],
            [4, 3, 3],
        ],
        alloc: [
            [0, 1, 0],
            [2, 0, 0],
            [3, 0, 2],
            [2, 1, 1],
            [0, 0, 2],
        ],
        sampleRequests: [
            { id: reqId(), pid: 1, vector: [1, 0, 2] },
            { id: reqId(), pid: 4, vector: [3, 3, 0] },
        ],
    },

    // ── 3. Unsafe — exceeds need ──────────────────────────────────────────────
    {
        name: 'Request > Need (Invalid)',
        description: 'N=3, M=2 — A request that exceeds the declared max demand, testing error handling.',
        n: 3,
        m: 2,
        total: [8, 6],
        max: [
            [4, 3],
            [2, 2],
            [6, 4],
        ],
        alloc: [
            [2, 1],
            [1, 1],
            [3, 2],
        ],
        sampleRequests: [
            { id: reqId(), pid: 0, vector: [5, 3] }, // exceeds need
        ],
    },

    // ── 4. Deadlock scenario ─────────────────────────────────────────────────
    {
        name: 'Deadlock Detection — Cycle',
        description: 'N=3, M=2 — Circular wait: P0 waits for P1, P1 waits for P2, P2 waits for P0.',
        n: 3,
        m: 2,
        total: [3, 3],
        max: [
            [2, 2],
            [2, 2],
            [2, 2],
        ],
        alloc: [
            [1, 0],
            [0, 1],
            [1, 1],
        ],
        sampleRequests: [
            // P0 waiting for R1 (held by P1,P2), P1 waiting for R0 (held by P0,P2), P2 waiting for both
            { id: reqId(), pid: 0, vector: [0, 1] },
            { id: reqId(), pid: 1, vector: [1, 0] },
            { id: reqId(), pid: 2, vector: [1, 0] },
        ],
    },

    // ── 5. Complex ───────────────────────────────────────────────────────────
    {
        name: 'Complex — 5 Processes, 4 Resources',
        description: 'N=5, M=4 — Large scenario testing correctness of both algorithms.',
        n: 5,
        m: 4,
        total: [12, 8, 6, 10],
        max: [
            [6, 4, 3, 5],
            [3, 2, 2, 4],
            [8, 0, 2, 3],
            [2, 2, 2, 2],
            [4, 3, 3, 6],
        ],
        alloc: [
            [0, 1, 0, 2],
            [2, 0, 0, 1],
            [3, 0, 2, 0],
            [2, 1, 1, 1],
            [0, 0, 2, 1],
        ],
        sampleRequests: [
            { id: reqId(), pid: 1, vector: [1, 0, 2, 1] },
            { id: reqId(), pid: 3, vector: [0, 1, 0, 0] },
        ],
    },

    // ── 6. Custom (blank slate) ──────────────────────────────────────────────
    {
        name: 'Custom',
        description: 'Start from scratch — set your own N, M, matrices and requests.',
        n: 3,
        m: 3,
        total: [0, 0, 0],
        max: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        alloc: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        sampleRequests: [],
        isCustom: true,
    },
];

export function getDefaultScenario(): Scenario {
    return SCENARIOS[0];
}

/**
 * Build a blank Custom scenario with zero-filled matrices for given N and M.
 * Used when the user clicks the Custom preset button.
 */
export function makeCustomScenario(n: number, m: number): Scenario {
    return {
        name: 'Custom',
        description: 'Your custom scenario',
        n,
        m,
        total: new Array(m).fill(0),
        max: Array.from({ length: n }, () => new Array(m).fill(0)),
        alloc: Array.from({ length: n }, () => new Array(m).fill(0)),
        sampleRequests: [],
        isCustom: true,
    };
}

/** Index of the Custom entry in SCENARIOS */
export const CUSTOM_SCENARIO_IDX = SCENARIOS.findIndex((s) => s.isCustom);

export function makeEmptyRequest(pid: number, m: number): ResourceRequest {
    return { id: reqId(), pid, vector: new Array(m).fill(0) };
}

export function makeRandomRequest(n: number, _m: number, available: number[]): ResourceRequest {
    const pid = Math.floor(Math.random() * n);
    const vector = available.map((a) => (a > 0 ? Math.floor(Math.random() * Math.min(a, 3)) : 0));
    return { id: reqId(), pid, vector };
}
