/**
 * algorithms.test.ts
 * Unit tests for core algorithm functions.
 *
 * Run with: npm test
 *
 * Scenarios covered:
 *  1. computeAvailable / computeNeed
 *  2. Trivial safe scenario (Banker's Algorithm)
 *  3. Request > Need (should be denied)
 *  4. Request > Available (should wait)
 *  5. Unsafe request (passes validate but fails safety)
 *  6. WFG construction
 *  7. Cycle detection in WFG (deadlock detected)
 *  8. No cycle (no deadlock)
 *  9. validateSimulationInputs
 */

import { describe, it, expect } from 'vitest';
import {
    computeAvailable,
    computeNeed,
    bankersAlgorithm,
    buildWaitForGraph,
    detectCycleInWFG,
    runDeadlockDetection,
    validateSimulationInputs,
    safetyCheck,
} from '../src/utils/algorithms';

// ─── Shared test data ─────────────────────────────────────────────────────────

// Classic textbook example (N=3, M=3)
const TOTAL = [10, 5, 7];
const MAX = [[7, 5, 3], [3, 2, 2], [9, 0, 2]];
const ALLOC = [[0, 1, 0], [2, 0, 0], [3, 0, 2]];
// Available = [5,4,5], Need = [[7,4,3],[1,2,2],[6,0,0]]

// ─── 1. computeAvailable ─────────────────────────────────────────────────────

describe('computeAvailable', () => {
    it('subtracts sum of allocations from total', () => {
        const result = computeAvailable(TOTAL, ALLOC);
        expect(result).toEqual([5, 4, 5]);
    });

    it('returns total when nothing is allocated', () => {
        const alloc = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        expect(computeAvailable(TOTAL, alloc)).toEqual(TOTAL);
    });

    it('returns zeros when everything is allocated', () => {
        // TOTAL=[10,5,7]: sum R0=3+3+4=10, R1=2+2+1=5, R2=2+2+3=7 → all consumed
        const alloc = [[3, 2, 2], [3, 2, 2], [4, 1, 3]];
        expect(computeAvailable(TOTAL, alloc)).toEqual([0, 0, 0]);
    });
});

// ─── 2. computeNeed ──────────────────────────────────────────────────────────

describe('computeNeed', () => {
    it('computes need = max - alloc', () => {
        const need = computeNeed(MAX, ALLOC);
        expect(need).toEqual([[7, 4, 3], [1, 2, 2], [6, 0, 0]]);
    });

    it('need is zero when alloc = max', () => {
        const need = computeNeed(MAX, MAX);
        need.forEach(row => row.forEach(v => expect(v).toBe(0)));
    });
});

// ─── 3. Trivial safe scenario ─────────────────────────────────────────────────

describe("Banker's Algorithm — safe scenario", () => {
    it('grants request pid=1 [1,0,2] and returns safe sequence', () => {
        const result = bankersAlgorithm(TOTAL, MAX, ALLOC, {
            id: 'test-1',
            pid: 1,
            vector: [1, 0, 2],
        });
        expect(result.granted).toBe(true);
        expect(result.safeSequence).toBeDefined();
        expect(result.safeSequence!.length).toBe(3);
        // All processes in sequence
        expect(result.safeSequence!.sort()).toEqual([0, 1, 2]);
    });

    it('updates available after grant', () => {
        const result = bankersAlgorithm(TOTAL, MAX, ALLOC, {
            id: 'test-2',
            pid: 1,
            vector: [1, 0, 2],
        });
        expect(result.newAvailable).toEqual([4, 4, 3]);
    });
});

// ─── 4. Request > Need (invalid) ─────────────────────────────────────────────

describe("Banker's Algorithm — request > need", () => {
    it('denies the request when vector exceeds need', () => {
        // Need[P0] = [7,4,3], request [8,0,0] exceeds need on R0
        const result = bankersAlgorithm(TOTAL, MAX, ALLOC, {
            id: 'test-3',
            pid: 0,
            vector: [8, 0, 0],
        });
        expect(result.granted).toBe(false);
        expect(result.reason).toMatch(/exceeded/i);
    });

    it('provides steps explaining why', () => {
        const result = bankersAlgorithm(TOTAL, MAX, ALLOC, {
            id: 'test-4',
            pid: 0,
            vector: [8, 0, 0],
        });
        // Step log should contain a validation failure entry
        const failStep = result.steps.find(s => s.phase === 'validate' && s.message.includes('❌'));
        expect(failStep).toBeDefined();
    });
});

// ─── 5. Request > Available (must wait) ──────────────────────────────────────

describe("Banker's Algorithm — request > available", () => {
    it('denies when request exceeds available resources', () => {
        // Available = [5,4,5]; request [6,0,0] exceeds R0
        const result = bankersAlgorithm(TOTAL, MAX, ALLOC, {
            id: 'test-5',
            pid: 0,
            vector: [6, 0, 0],
        });
        expect(result.granted).toBe(false);
        expect(result.reason).toMatch(/available/i);
    });
});

// ─── 6. Unsafe request (passes validate, fails safety) ───────────────────────

describe("Banker's Algorithm — unsafe state", () => {
    // Use a state that is one step away from unsafe
    // N=2, M=2, Total=[4,4], Max=[[3,3],[3,3]], Alloc=[[1,1],[2,2]]
    // Available=[1,1], Need=[[2,2],[1,1]]
    // Request P0 [1,1]: tentative Alloc=[[2,2],[2,2]], available=[0,0]
    // Safety: P1 needs [1,1] > [0,0] → unsafe
    const total2 = [4, 4];
    const max2 = [[3, 3], [3, 3]];
    const alloc2 = [[1, 1], [2, 2]];

    it('denies a request that would create an unsafe state', () => {
        const result = bankersAlgorithm(total2, max2, alloc2, {
            id: 'test-6',
            pid: 0,
            vector: [1, 1],
        });
        expect(result.granted).toBe(false);
        expect(result.reason).toMatch(/unsafe/i);
    });

    it('logs a rollback step', () => {
        const result = bankersAlgorithm(total2, max2, alloc2, {
            id: 'test-7',
            pid: 0,
            vector: [1, 1],
        });
        const rollbackStep = result.steps.find(s => s.phase === 'rollback');
        expect(rollbackStep).toBeDefined();
    });
});

// ─── 7. safetyCheck standalone ───────────────────────────────────────────────

describe('safetyCheck', () => {
    it('returns correct safe sequence for known safe state', () => {
        const available = [5, 4, 5];
        const need = [[7, 4, 3], [1, 2, 2], [6, 0, 0]];
        const alloc = [[0, 1, 0], [2, 0, 0], [3, 0, 2]];
        const { safe, safeSequence } = safetyCheck(available, need, alloc, 3);
        expect(safe).toBe(true);
        expect(safeSequence.length).toBe(3);
    });

    it('returns unsafe for a deadlocked state', () => {
        // All processes need more than available, no one can run
        const available = [0, 0];
        const need = [[1, 1], [1, 1]];
        const alloc = [[2, 2], [2, 2]];
        const { safe } = safetyCheck(available, need, alloc, 2);
        expect(safe).toBe(false);
    });
});

// ─── 8. buildWaitForGraph ─────────────────────────────────────────────────────

describe('buildWaitForGraph', () => {
    // P0 holds R0, P1 holds R1, P2 holds both
    const alloc3 = [[1, 0], [0, 1], [1, 1]];
    // P0 requests R1 → waits for P1 (holds R1) and P2 (holds R1)
    const requests3 = [{ id: 'r1', pid: 0, vector: [0, 1] }];

    it('creates edges for each holder of requested resource', () => {
        const { edges } = buildWaitForGraph(alloc3, requests3);
        const froms = edges.filter(e => e.from === 0).map(e => e.to).sort();
        expect(froms).toContain(1); // P0 waits for P1
        expect(froms).toContain(2); // P0 waits for P2
    });

    it('does not add self-edges', () => {
        const { edges } = buildWaitForGraph(alloc3, requests3);
        edges.forEach(e => expect(e.from).not.toBe(e.to));
    });

    it('returns empty edges when no requests', () => {
        const { edges } = buildWaitForGraph(alloc3, []);
        expect(edges.length).toBe(0);
    });
});

// ─── 9. detectCycleInWFG ─────────────────────────────────────────────────────

describe('detectCycleInWFG — with cycle', () => {
    it('detects a simple 2-node cycle P0→P1→P0', () => {
        const adjList = new Map([
            [0, [1]],
            [1, [0]],
        ]);
        const { deadlocked, deadlockedProcesses } = detectCycleInWFG(adjList);
        expect(deadlocked).toBe(true);
        expect(deadlockedProcesses).toContain(0);
        expect(deadlockedProcesses).toContain(1);
    });

    it('detects a 3-node cycle P0→P1→P2→P0', () => {
        const adjList = new Map([
            [0, [1]],
            [1, [2]],
            [2, [0]],
        ]);
        const { deadlocked, cyclePaths } = detectCycleInWFG(adjList);
        expect(deadlocked).toBe(true);
        expect(cyclePaths.length).toBeGreaterThan(0);
    });
});

describe('detectCycleInWFG — no cycle', () => {
    it('returns no deadlock for a DAG', () => {
        const adjList = new Map([
            [0, [1]],
            [1, [2]],
            [2, []],
        ]);
        const { deadlocked } = detectCycleInWFG(adjList);
        expect(deadlocked).toBe(false);
    });

    it('returns no deadlock for isolated nodes', () => {
        const adjList = new Map([
            [0, []],
            [1, []],
            [2, []],
        ]);
        const { deadlocked } = detectCycleInWFG(adjList);
        expect(deadlocked).toBe(false);
    });
});

// ─── 10. runDeadlockDetection (integration) ───────────────────────────────────

describe('runDeadlockDetection — integration', () => {
    it('correctly detects circular wait', () => {
        // P0 holds R0, P1 holds R1, P2 holds both
        const alloc = [[1, 0], [0, 1], [1, 1]];
        // P0 waits for R1 (held by P1,P2), P1 waits for R0 (held by P0,P2)
        const requests = [
            { id: 'a', pid: 0, vector: [0, 1] },
            { id: 'b', pid: 1, vector: [1, 0] },
        ];
        const result = runDeadlockDetection(alloc, requests);
        expect(result.deadlocked).toBe(true);
    });

    it('no deadlock when there is no circular wait', () => {
        const alloc = [[1, 0], [0, 1], [0, 0]];
        // Only P2 is waiting, no one waits for P2 → no cycle
        const requests = [{ id: 'a', pid: 2, vector: [1, 0] }];
        const result = runDeadlockDetection(alloc, requests);
        expect(result.deadlocked).toBe(false);
    });
});

// ─── 11. validateSimulationInputs ────────────────────────────────────────────

describe('validateSimulationInputs', () => {
    it('returns no errors for valid input', () => {
        expect(validateSimulationInputs(TOTAL, MAX, ALLOC)).toEqual([]);
    });

    it('reports error when alloc > max', () => {
        const badAlloc = ALLOC.map(r => [...r]);
        badAlloc[0][0] = 8; // P0 R0: alloc(8) > max(7)
        const errors = validateSimulationInputs(TOTAL, MAX, badAlloc);
        expect(errors.some(e => e.includes('P0') && e.includes('R0'))).toBe(true);
    });

    it('reports error when sum(alloc) > total', () => {
        const badAlloc = ALLOC.map(r => [...r]);
        badAlloc[0][0] = 7; // sum R0 now = 7+2+3 = 12 > 10
        const errors = validateSimulationInputs(TOTAL, MAX, badAlloc);
        expect(errors.some(e => e.includes('R0'))).toBe(true);
    });
});
