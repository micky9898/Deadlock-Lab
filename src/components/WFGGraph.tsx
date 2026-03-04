/**
 * WFGGraph.tsx
 * SVG-based Wait-For Graph visualizer.
 * Nodes: processes (circles); edges: waits-for relationships; cycles highlighted in red.
 */
import React, { useMemo } from 'react';
import type { WFGEdge } from '../types';

interface Props {
    n: number;
    edges: WFGEdge[];
    deadlockedProcesses: number[];
    cyclePaths: number[][];
}

const WIDTH = 620;
const HEIGHT = 320;
const R = 26; // node radius

function getNodePos(i: number, n: number): { x: number; y: number } {
    if (n === 1) return { x: WIDTH / 2, y: HEIGHT / 2 };
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const radius = Math.min(WIDTH, HEIGHT) / 2 - 60;
    return {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
    };
}

// Build a set of edges that participate in a cycle
function buildCycleEdgeSet(cyclePaths: number[][]): Set<string> {
    const set = new Set<string>();
    for (const path of cyclePaths) {
        for (let k = 0; k < path.length - 1; k++) {
            set.add(`${path[k]}-${path[k + 1]}`);
        }
    }
    return set;
}

const WFGGraph: React.FC<Props> = ({ n, edges, deadlockedProcesses, cyclePaths }) => {
    const positions = useMemo(
        () => Array.from({ length: n }, (_, i) => ({ i, ...getNodePos(i, n) })),
        [n]
    );

    const deadSet = new Set(deadlockedProcesses);
    const cycleEdgeSet = buildCycleEdgeSet(cyclePaths);

    // Collapse multi-edges between same pair into one for display
    const displayEdges = useMemo(() => {
        const seen = new Set<string>();
        const result: WFGEdge[] = [];
        for (const e of edges) {
            const key = `${e.from}-${e.to}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(e);
            }
        }
        return result;
    }, [edges]);

    const renderCurvedArrow = (e: WFGEdge, reverse = false) => {
        const src = positions[e.from];
        const dst = positions[e.to];
        if (!src || !dst) return null;

        const isCycle = cycleEdgeSet.has(`${e.from}-${e.to}`);

        // Direction vector
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return null;

        const ux = dx / dist;
        const uy = dy / dist;

        // Offset start/end by node radius
        const sx = src.x + ux * R;
        const sy = src.y + uy * R;
        const ex = dst.x - ux * R;
        const ey = dst.y - uy * R;

        // Mid-point curve offset (perpendicular)
        const curveOffset = reverse ? -30 : 30;
        const mx = (sx + ex) / 2 - uy * curveOffset;
        const my = (sy + ey) / 2 + ux * curveOffset;

        const d = `M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`;
        const key = `edge-${e.from}-${e.to}`;

        // Mid-point for label
        const lx = (sx + ex) / 2 - uy * (curveOffset * 0.7);
        const ly = (sy + ey) / 2 + ux * (curveOffset * 0.7);

        return (
            <g key={key}>
                <path
                    d={d}
                    className={`wfg-edge ${isCycle ? 'cycle-edge' : ''}`}
                    markerEnd="url(#arrowhead)"
                />
                <text x={lx} y={ly} className="wfg-edge-label" textAnchor="middle">
                    R{e.resourceIdx}
                </text>
            </g>
        );
    };

    // Check for mutual edges (bidirectional) for curve separation
    const edgeIndex = new Map<string, number>();
    displayEdges.forEach((e) => {
        edgeIndex.set(`${e.from}-${e.to}`, 1);
    });

    return (
        <div className="wfg-container">
            {n === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">🕸️</span>
                    <span className="empty-text">No processes configured</span>
                </div>
            ) : (
                <svg
                    className="wfg-svg"
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    aria-label="Wait-For Graph"
                    role="img"
                >
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="8"
                            markerHeight="6"
                            refX="6"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="var(--text-muted)" />
                        </marker>
                        <marker
                            id="arrowhead-cycle"
                            markerWidth="8"
                            markerHeight="6"
                            refX="6"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 8 3, 0 6" fill="var(--color-unsafe)" />
                        </marker>
                    </defs>

                    {/* Edges */}
                    {displayEdges.map((e) => {
                        const hasReverse = edgeIndex.has(`${e.to}-${e.from}`);
                        return renderCurvedArrow(e, hasReverse);
                    })}

                    {/* Nodes */}
                    {positions.map(({ i, x, y }) => {
                        const isDeadlocked = deadSet.has(i);
                        return (
                            <g key={i} className="wfg-node" transform={`translate(${x},${y})`}>
                                {/* Glow */}
                                {isDeadlocked && (
                                    <circle
                                        r={R + 8}
                                        fill="rgba(239,68,68,0.15)"
                                        stroke="rgba(239,68,68,0.3)"
                                        strokeWidth={1}
                                    />
                                )}
                                <circle
                                    r={R}
                                    className={`wfg-node-circle ${isDeadlocked ? 'deadlocked' : 'safe-node'}`}
                                    stroke={isDeadlocked ? 'var(--color-unsafe)' : 'var(--accent-blue)'}
                                    strokeWidth={2}
                                    fill={
                                        isDeadlocked
                                            ? 'rgba(239,68,68,0.25)'
                                            : 'rgba(61,139,255,0.18)'
                                    }
                                />
                                <text className="wfg-node-text" textAnchor="middle" dy="0.4em">
                                    P{i}
                                </text>
                            </g>
                        );
                    })}

                    {/* Legend */}
                    <g transform={`translate(12,${HEIGHT - 44})`}>
                        <circle cx={8} cy={8} r={7} fill="rgba(61,139,255,0.18)" stroke="var(--accent-blue)" strokeWidth={1.5} />
                        <text x={20} y={12} fill="var(--text-muted)" fontSize={10} fontFamily="Inter, sans-serif">Process (active)</text>
                        <circle cx={8} cy={28} r={7} fill="rgba(239,68,68,0.25)" stroke="var(--color-unsafe)" strokeWidth={1.5} />
                        <text x={20} y={32} fill="var(--text-muted)" fontSize={10} fontFamily="Inter, sans-serif">Process (deadlocked)</text>
                    </g>
                </svg>
            )}
        </div>
    );
};

export default WFGGraph;
