/**
 * useSimulator.ts
 * Central state management hook for the deadlock simulation.
 * Manages simulation state, playback controls, and algorithm execution.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type {
    SimulationState,
    ResourceRequest,
    BankersResult,
    DetectionResult,
    AlgorithmType,
} from '../types';
import {
    computeAvailable,
    computeNeed,
    bankersAlgorithm,
    runDeadlockDetection,
    buildWaitForGraph,
    validateSimulationInputs,
} from '../utils/algorithms';
import { SCENARIOS, CUSTOM_SCENARIO_IDX, makeCustomScenario } from '../utils/presets';

// ─── Initial state ────────────────────────────────────────────────────────────

function buildInitialState(): SimulationState {
    const s = SCENARIOS[0];
    const alloc = s.alloc.map((r) => [...r]);
    const available = computeAvailable(s.total, alloc);
    const need = computeNeed(s.max, alloc);
    return {
        n: s.n,
        m: s.m,
        total: [...s.total],
        max: s.max.map((r) => [...r]),
        alloc,
        available,
        need,
    };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSimulator() {
    // ── Core sim state ───────────────────────────────────────────────────────
    const [simState, setSimState] = useState<SimulationState>(buildInitialState);
    const [algorithm, setAlgorithm] = useState<AlgorithmType>('bankers');
    const [requests, setRequests] = useState<ResourceRequest[]>(SCENARIOS[0].sampleRequests);
    const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // ── Results ──────────────────────────────────────────────────────────────
    const [bankersResults, setBankersResults] = useState<BankersResult[]>([]);
    const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

    // ── Playback ─────────────────────────────────────────────────────────────
    const [allSteps, setAllSteps] = useState<import('../types').SimStep[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(600);
    const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── WFG for detection panel (always built from current state) ─────────────
    const [wfgEdges, setWfgEdges] = useState<import('../types').WFGEdge[]>([]);

    // ── Recompute derived fields whenever alloc/total/max changes ─────────────
    const recompute = useCallback(
        (state: SimulationState): SimulationState => ({
            ...state,
            available: computeAvailable(state.total, state.alloc),
            need: computeNeed(state.max, state.alloc),
        }),
        []
    );

    // ── Apply a partial update to simState ───────────────────────────────────
    const updateSimState = useCallback(
        (partial: Partial<SimulationState>) => {
            setSimState((prev) => recompute({ ...prev, ...partial }));
            setSelectedPreset(null); // deselect preset on manual edit
            setBankersResults([]);
            setDetectionResult(null);
            setAllSteps([]);
            setStepIndex(0);
        },
        [recompute]
    );

    // ── Load a preset scenario ───────────────────────────────────────────────
    const loadPreset = useCallback(
        (idx: number) => {
            const s = SCENARIOS[idx];
            const state: SimulationState = recompute({
                n: s.n,
                m: s.m,
                total: [...s.total],
                max: s.max.map((r) => [...r]),
                alloc: s.alloc.map((r) => [...r]),
                available: [],
                need: [],
            });
            setSimState(state);
            setRequests(s.sampleRequests.map((r) => ({ ...r })));
            setSelectedPreset(idx);
            setBankersResults([]);
            setDetectionResult(null);
            setAllSteps([]);
            setStepIndex(0);
            setIsPlaying(false);
        },
        [recompute]
    );

    // ── Load a custom (blank) scenario ───────────────────────────────────────
    const loadCustom = useCallback(() => {
        const { n, m } = simState; // preserve current dimensions
        const s = makeCustomScenario(n, m);
        const state: SimulationState = recompute({
            n: s.n,
            m: s.m,
            total: [...s.total],
            max: s.max.map((r) => [...r]),
            alloc: s.alloc.map((r) => [...r]),
            available: [],
            need: [],
        });
        setSimState(state);
        setRequests([]);
        setSelectedPreset(CUSTOM_SCENARIO_IDX);
        setBankersResults([]);
        setDetectionResult(null);
        setAllSteps([]);
        setStepIndex(0);
        setIsPlaying(false);
    }, [simState, recompute]);

    // ── Request management ───────────────────────────────────────────────────
    const addRequest = useCallback((req: ResourceRequest) => {
        setRequests((prev) => [...prev, req]);
    }, []);

    const removeRequest = useCallback((id: string) => {
        setRequests((prev) => prev.filter((r) => r.id !== id));
    }, []);

    const clearRequests = useCallback(() => setRequests([]), []);

    // ── Validate inputs ──────────────────────────────────────────────────────
    const validate = useCallback((): boolean => {
        const errors = validateSimulationInputs(simState.total, simState.max, simState.alloc);
        setValidationErrors(errors);
        return errors.length === 0;
    }, [simState]);

    // ── Run simulation ───────────────────────────────────────────────────────
    const runSimulation = useCallback(() => {
        if (!validate()) return;
        if (requests.length === 0) return;

        setIsPlaying(false);

        if (algorithm === 'bankers') {
            // Run Banker's Algorithm for each queued request sequentially
            // Each request uses the state after the previous one (if granted)
            let currentAlloc = simState.alloc.map((r) => [...r]);
            const results: BankersResult[] = [];
            const combined: import('../types').SimStep[] = [];

            for (const req of requests) {
                const result = bankersAlgorithm(
                    simState.total,
                    simState.max,
                    currentAlloc,
                    req
                );
                results.push(result);
                combined.push(...result.steps);
                if (result.granted && result.newAlloc) {
                    currentAlloc = result.newAlloc;
                }
            }

            setBankersResults(results);
            setDetectionResult(null);
            setAllSteps(combined);
            setStepIndex(0);

            // Update alloc to final state if any were granted
            if (results.some((r) => r.granted)) {
                const lastGranted = [...results].reverse().find((r) => r.granted);
                if (lastGranted?.newAlloc) {
                    setSimState((prev) =>
                        recompute({ ...prev, alloc: lastGranted.newAlloc! })
                    );
                }
            }
        } else {
            // Detection mode
            const result = runDeadlockDetection(simState.alloc, requests);
            const { edges } = buildWaitForGraph(simState.alloc, requests);
            setDetectionResult(result);
            setWfgEdges(edges);
            setBankersResults([]);
            setAllSteps(result.steps);
            setStepIndex(0);
        }
    }, [simState, requests, algorithm, validate, recompute]);

    // ── Rebuild WFG preview whenever alloc/requests change (detection mode) ──
    useEffect(() => {
        if (algorithm === 'detection') {
            const { edges } = buildWaitForGraph(simState.alloc, requests);
            setWfgEdges(edges);
        }
    }, [simState.alloc, requests, algorithm]);

    // ── Playback ─────────────────────────────────────────────────────────────
    const stepNext = useCallback(() => {
        setStepIndex((i) => Math.min(i + 1, allSteps.length - 1));
    }, [allSteps.length]);

    const stepPrev = useCallback(() => {
        setStepIndex((i) => Math.max(i - 1, 0));
    }, []);

    const stepFirst = useCallback(() => setStepIndex(0), []);
    const stepLast = useCallback(() => setStepIndex(allSteps.length - 1), [allSteps.length]);
    const seekStep = useCallback((idx: number) => setStepIndex(idx), []);

    const play = useCallback(() => setIsPlaying(true), []);
    const pause = useCallback(() => setIsPlaying(false), []);

    const resetPlayback = useCallback(() => {
        setIsPlaying(false);
        setStepIndex(0);
    }, []);

    // Timer for auto-play
    useEffect(() => {
        if (!isPlaying) {
            if (playTimerRef.current) clearTimeout(playTimerRef.current);
            return;
        }
        if (stepIndex >= allSteps.length - 1) {
            setIsPlaying(false);
            return;
        }
        playTimerRef.current = setTimeout(() => {
            setStepIndex((i) => i + 1);
        }, playSpeed);
        return () => {
            if (playTimerRef.current) clearTimeout(playTimerRef.current);
        };
    }, [isPlaying, stepIndex, allSteps.length, playSpeed]);

    // ── Reset everything ─────────────────────────────────────────────────────
    const resetAll = useCallback(() => {
        loadPreset(selectedPreset ?? 0);
    }, [loadPreset, selectedPreset]);

    // ── Export log ───────────────────────────────────────────────────────────
    const exportLog = useCallback(() => {
        const text = allSteps
            .map((s) => `[${s.timestamp}] [${s.phase.toUpperCase()}] ${s.message}`)
            .join('\n');
        navigator.clipboard.writeText(text).catch(() => {
            // fallback: open in new window
            const win = window.open('', '_blank');
            win?.document.write(`<pre>${text}</pre>`);
        });
    }, [allSteps]);

    return {
        // State
        simState,
        algorithm,
        requests,
        selectedPreset,
        validationErrors,
        bankersResults,
        detectionResult,
        wfgEdges,
        // Playback
        allSteps,
        stepIndex,
        isPlaying,
        playSpeed,
        // Actions
        updateSimState,
        loadPreset,
        loadCustom,
        isCustomActive: selectedPreset === CUSTOM_SCENARIO_IDX,
        setAlgorithm,
        addRequest,
        removeRequest,
        clearRequests,
        runSimulation,
        // Playback controls
        stepNext,
        stepPrev,
        stepFirst,
        stepLast,
        seekStep,
        play,
        pause,
        resetPlayback,
        setPlaySpeed,
        resetAll,
        exportLog,
    };
}
