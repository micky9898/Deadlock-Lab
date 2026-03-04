/**
 * algorithms.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, deterministic implementations of:
 *   1. Banker's Algorithm (deadlock avoidance)
 *   2. Wait-For Graph construction
 *   3. Cycle detection in WFG (deadlock detection)
 *
 * All functions are side-effect-free and unit-testable.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
    BankersResult,
    DetectionResult,
    ResourceRequest,
    SimStep,
    WFGEdge,
} from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a unique step id */
let _stepCounter = 0;
function makeStep(
    phase: SimStep['phase'],
    message: string,
    details?: Record<string, unknown>
): SimStep {
    return {
        id: `step-${++_stepCounter}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        phase,
        message,
        details,
    };
}

/** Deep clone a 2-D number array */
function clone2D(m: number[][]): number[][] {
    return m.map((row) => [...row]);
}

/** Deep clone a 1-D number array */
function clone1D(a: number[]): number[] {
    return [...a];
}

// ─── 1. computeAvailable ─────────────────────────────────────────────────────

/**
 * Compute the vector of currently available resources.
 *
 * @param total  - Total resource instances for each type  [M]
 * @param alloc  - Current allocation matrix              [N × M]
 * @returns available[j] = total[j] - Σ alloc[i][j]
 */
export function computeAvailable(total: number[], alloc: number[][]): number[] {
    const m = total.length;
    const available = clone1D(total);
    for (const row of alloc) {
        for (let j = 0; j < m; j++) {
            available[j] -= row[j];
        }
    }
    return available;
}

// ─── 2. computeNeed ──────────────────────────────────────────────────────────

/**
 * Compute the need matrix.
 *
 * @param max   - Maximum demand matrix [N × M]
 * @param alloc - Current allocation    [N × M]
 * @returns need[i][j] = max[i][j] − alloc[i][j]
 */
export function computeNeed(max: number[][], alloc: number[][]): number[][] {
    return max.map((row, i) => row.map((v, j) => v - alloc[i][j]));
}

// ─── 3. safetyCheck ──────────────────────────────────────────────────────────

/**
 * Run the Banker's safety algorithm on a given state.
 * Returns the safe sequence (if one exists) and the steps taken.
 *
 * @param available - Available resources vector [M]
 * @param need      - Need matrix               [N × M]
 * @param n         - Number of processes
 * @returns { safe, safeSequence, steps }
 */
export function safetyCheck(
    available: number[],
    need: number[][],
    alloc: number[][],
    n: number
): { safe: boolean; safeSequence: number[]; steps: SimStep[] } {
    const steps: SimStep[] = [];
    const work = clone1D(available);           // work = available
    const finish = new Array<boolean>(n).fill(false);
    const safeSequence: number[] = [];

    steps.push(
        makeStep('safety', '🔍 Safety check started', {
            work: [...work],
            finish: [...finish],
        })
    );

    let found = true;
    // Iterate until no more processes can be added (or we've found all)
    while (found && safeSequence.length < n) {
        found = false;
        for (let i = 0; i < n; i++) {
            if (finish[i]) continue;
            // Check if need[i] ≤ work
            const canRun = need[i].every((v, j) => v <= work[j]);
            if (canRun) {
                // Simulate process i completing and releasing its resources
                steps.push(
                    makeStep(
                        'safety',
                        `✅ Process P${i} can execute (need ≤ work)`,
                        { need: [...need[i]], work: [...work] }
                    )
                );
                for (let j = 0; j < work.length; j++) {
                    work[j] += alloc[i][j];
                }
                finish[i] = true;
                safeSequence.push(i);
                found = true;
                steps.push(
                    makeStep(
                        'safety',
                        `   P${i} finishes → releases alloc, work = [${work.join(', ')}]`,
                        { newWork: [...work], safeSequence: [...safeSequence] }
                    )
                );
                break; // restart scan from beginning
            }
        }
    }

    const safe = safeSequence.length === n;
    steps.push(
        makeStep(
            'safety',
            safe
                ? `🟢 System is SAFE. Sequence: ${safeSequence.map((p) => `P${p}`).join(' → ')}`
                : `🔴 System is UNSAFE — no safe sequence exists`,
            { safe, safeSequence }
        )
    );

    return { safe, safeSequence, steps };
}

// ─── 4. bankersAlgorithm ─────────────────────────────────────────────────────

/**
 * Full Banker's Algorithm for a single resource request.
 *
 * Steps:
 *  (a) Validate request ≤ need[pid]
 *  (b) Validate request ≤ available
 *  (c) Tentatively allocate
 *  (d) Run safety check
 *  (e) Commit if safe, rollback otherwise
 *
 * @param total   - Total resource instances   [M]
 * @param max     - Max demand matrix          [N × M]
 * @param alloc   - Current allocation         [N × M]
 * @param request - The resource request object
 * @returns BankersResult
 */
export function bankersAlgorithm(
    total: number[],
    max: number[][],
    alloc: number[][],
    request: ResourceRequest
): BankersResult {
    _stepCounter = 0; // reset for each top-level call
    const steps: SimStep[] = [];
    const { pid, vector } = request;
    const m = total.length;
    const n = alloc.length;

    const available = computeAvailable(total, alloc);
    const need = computeNeed(max, alloc);

    steps.push(
        makeStep('info', `📋 Processing request from P${pid}: [${vector.join(', ')}]`, {
            available: [...available],
            need: need.map((r) => [...r]),
        })
    );

    // ── (a) Validate request ≤ need[pid] ─────────────────────────────────────
    steps.push(makeStep('validate', `🔎 Step 1: Check request ≤ need[P${pid}]`));
    for (let j = 0; j < m; j++) {
        if (vector[j] > need[pid][j]) {
            const reason = `Request[${j}]=${vector[j]} > Need[P${pid}][${j}]=${need[pid][j]} — process has exceeded its maximum claim`;
            steps.push(makeStep('validate', `❌ Validation failed: ${reason}`));
            return { granted: false, reason, steps };
        }
    }
    steps.push(makeStep('validate', `✅ Request ≤ Need[P${pid}] — OK`));

    // ── (b) Validate request ≤ available ─────────────────────────────────────
    steps.push(makeStep('validate', `🔎 Step 2: Check request ≤ available`));
    for (let j = 0; j < m; j++) {
        if (vector[j] > available[j]) {
            const reason = `Request[${j}]=${vector[j]} > Available[${j}]=${available[j]} — process must wait (resources not available)`;
            steps.push(makeStep('validate', `⏳ ${reason}`));
            return { granted: false, reason, steps };
        }
    }
    steps.push(makeStep('validate', `✅ Request ≤ Available — OK`));

    // ── (c) Tentative allocation ──────────────────────────────────────────────
    steps.push(makeStep('tentative', `🔄 Step 3: Tentatively allocate resources to P${pid}`));
    const tentativeAlloc = clone2D(alloc);
    const tentativeAvailable = clone1D(available);
    for (let j = 0; j < m; j++) {
        tentativeAlloc[pid][j] += vector[j];
        tentativeAvailable[j] -= vector[j];
    }
    const tentativeNeed = computeNeed(max, tentativeAlloc);
    steps.push(
        makeStep('tentative', `   Tentative state:`, {
            available: [...tentativeAvailable],
            alloc: tentativeAlloc.map((r) => [...r]),
            need: tentativeNeed.map((r) => [...r]),
        })
    );

    // ── (d) Safety check on tentative state ──────────────────────────────────
    steps.push(makeStep('safety', `🔎 Step 4: Run safety algorithm on tentative state`));
    const { safe, safeSequence, steps: safetySteps } = safetyCheck(
        tentativeAvailable,
        tentativeNeed,
        tentativeAlloc,
        n
    );
    steps.push(...safetySteps);

    // ── (e) Commit or rollback ────────────────────────────────────────────────
    if (safe) {
        steps.push(
            makeStep('commit', `✅ Step 5: System is safe → GRANT request to P${pid}`, {
                safeSequence,
                newAlloc: tentativeAlloc,
                newAvailable: tentativeAvailable,
            })
        );
        return {
            granted: true,
            safeSequence,
            newAlloc: tentativeAlloc,
            newAvailable: tentativeAvailable,
            steps,
        };
    } else {
        steps.push(
            makeStep('rollback', `❌ Step 5: System would be unsafe → DENY request to P${pid} (rollback)`)
        );
        return {
            granted: false,
            reason: 'Request would lead to an unsafe state',
            steps,
        };
    }
}

// ─── 5. buildWaitForGraph ─────────────────────────────────────────────────────

/**
 * Build the Wait-For Graph from current allocation state + pending requests.
 *
 * Algorithm:
 *  For each pending request (pid, vector):
 *    For each resource type j where vector[j] > 0:
 *      Find all processes k (k ≠ pid) that have alloc[k][j] > 0
 *      Add edge pid → k ("pid waits for k to release resource j")
 *
 * @param alloc    - Current allocation  [N × M]
 * @param requests - List of pending requests
 * @returns Map<pid, Set<pid>> adjacency list and WFGEdge array
 */
export function buildWaitForGraph(
    alloc: number[][],
    requests: ResourceRequest[]
): { adjacencyList: Map<number, number[]>; edges: WFGEdge[]; steps: SimStep[] } {
    _stepCounter = 0;
    const steps: SimStep[] = [];
    const adjList = new Map<number, Set<number>>();
    const edges: WFGEdge[] = [];
    const n = alloc.length;

    // Initialise every process node
    for (let i = 0; i < n; i++) adjList.set(i, new Set());

    steps.push(
        makeStep('detection', `🕸️ Building Wait-For Graph with ${requests.length} pending request(s)`)
    );

    for (const req of requests) {
        const { pid, vector } = req;
        steps.push(
            makeStep('detection', `   Processing request P${pid}: [${vector.join(', ')}]`)
        );

        for (let j = 0; j < vector.length; j++) {
            if (vector[j] <= 0) continue;
            // Find all holders of resource type j
            for (let k = 0; k < n; k++) {
                if (k === pid) continue;
                if (alloc[k][j] > 0) {
                    if (!adjList.get(pid)!.has(k)) {
                        adjList.get(pid)!.add(k);
                        edges.push({ from: pid, to: k, resourceIdx: j });
                        steps.push(
                            makeStep(
                                'detection',
                                `   ➕ Edge P${pid} → P${k} (waiting for resource R${j} held by P${k})`
                            )
                        );
                    }
                }
            }
        }
    }

    // Convert sets to arrays for serialisation
    const listOut = new Map<number, number[]>();
    adjList.forEach((set, k) => listOut.set(k, Array.from(set)));

    steps.push(makeStep('detection', `🕸️ Wait-For Graph complete`, { edges: edges.map((e) => ({ ...e })) }));

    return { adjacencyList: listOut, edges, steps };
}

// ─── 6. detectCycleInWFG ─────────────────────────────────────────────────────

/**
 * Detect cycles in the Wait-For Graph using DFS with colouring.
 *
 * Colours:
 *  WHITE (0) = unvisited
 *  GRAY  (1) = in current DFS path (back-edge = cycle)
 *  BLACK (2) = fully processed
 *
 * @param adjacencyList - Adjacency list from buildWaitForGraph
 * @returns { deadlocked, deadlockedProcesses, cyclePaths, steps }
 */
export function detectCycleInWFG(
    adjacencyList: Map<number, number[]>
): { deadlocked: boolean; deadlockedProcesses: number[]; cyclePaths: number[][]; steps: SimStep[] } {
    const steps: SimStep[] = [];
    const nodes = Array.from(adjacencyList.keys());
    const color = new Map<number, 0 | 1 | 2>();
    nodes.forEach((n) => color.set(n, 0));
    const cyclePaths: number[][] = [];
    const deadlockedSet = new Set<number>();

    steps.push(makeStep('detection', `🔍 Running DFS cycle detection on Wait-For Graph`));

    function dfs(node: number, path: number[]): boolean {
        color.set(node, 1); // mark GRAY
        path.push(node);
        steps.push(
            makeStep('detection', `   DFS visit P${node}, path: [${path.map((p) => `P${p}`).join('→')}]`)
        );

        for (const neighbour of adjacencyList.get(node) ?? []) {
            if (color.get(neighbour) === 1) {
                // Found a back-edge → cycle
                const cycleStart = path.indexOf(neighbour);
                const cycle = path.slice(cycleStart);
                cyclePaths.push([...cycle, neighbour]);
                cycle.forEach((p) => deadlockedSet.add(p));
                steps.push(
                    makeStep(
                        'detection',
                        `🔴 Cycle detected: ${cycle.map((p) => `P${p}`).join(' → ')} → P${neighbour}`
                    )
                );
                return true;
            }
            if (color.get(neighbour) === 0) {
                dfs(neighbour, path);
            }
        }

        path.pop();
        color.set(node, 2); // mark BLACK
        return false;
    }

    for (const node of nodes) {
        if (color.get(node) === 0) {
            dfs(node, []);
        }
    }

    const deadlocked = deadlockedSet.size > 0;
    const deadlockedProcesses = Array.from(deadlockedSet).sort((a, b) => a - b);

    steps.push(
        makeStep(
            'detection',
            deadlocked
                ? `🔴 DEADLOCK detected! Processes involved: ${deadlockedProcesses.map((p) => `P${p}`).join(', ')}`
                : `🟢 No deadlock detected — no cycles in Wait-For Graph`,
            { deadlocked, deadlockedProcesses, cyclePaths }
        )
    );

    return { deadlocked, deadlockedProcesses, cyclePaths, steps };
}

// ─── 7. runDeadlockDetection ─────────────────────────────────────────────────

/**
 * Orchestrate deadlock detection: build WFG then detect cycles.
 *
 * @param alloc    - Current allocation  [N × M]
 * @param requests - All pending requests
 * @returns DetectionResult
 */
export function runDeadlockDetection(
    alloc: number[][],
    requests: ResourceRequest[]
): DetectionResult {
    const allSteps: SimStep[] = [];

    allSteps.push(makeStep('info', '🚀 Starting deadlock detection'));
    allSteps.push(makeStep('info', `   Processes: ${alloc.length}, Pending requests: ${requests.length}`));

    const { adjacencyList, steps: wfgSteps } = buildWaitForGraph(alloc, requests);
    allSteps.push(...wfgSteps);

    const { deadlocked, deadlockedProcesses, cyclePaths, steps: cycleSteps } =
        detectCycleInWFG(adjacencyList);
    allSteps.push(...cycleSteps);

    return { deadlocked, deadlockedProcesses, cyclePaths, adjacencyList, steps: allSteps };
}

// ─── 8. validateSimulationInputs ─────────────────────────────────────────────

/**
 * Validate the simulation state before running any algorithm.
 * Returns an array of error messages (empty = valid).
 */
export function validateSimulationInputs(
    total: number[],
    max: number[][],
    alloc: number[][]
): string[] {
    const errors: string[] = [];
    const n = alloc.length;
    const m = total.length;

    // Check alloc ≤ max
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            if (alloc[i][j] > max[i][j]) {
                errors.push(`Alloc[P${i}][R${j}]=${alloc[i][j]} > Max[P${i}][R${j}]=${max[i][j]}`);
            }
        }
    }

    // Check sum(alloc[:,j]) ≤ total[j]
    for (let j = 0; j < m; j++) {
        const sumAlloc = alloc.reduce((s, row) => s + row[j], 0);
        if (sumAlloc > total[j]) {
            errors.push(`Sum of Alloc for R${j} = ${sumAlloc} > Total[${j}]=${total[j]}`);
        }
    }

    return errors;
}
