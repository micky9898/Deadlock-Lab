/**
 * PlaybackBar.tsx
 * Step-forward / back / auto-play controls for animation.
 */
import React from 'react';
import {
    SkipBack,
    ChevronLeft,
    Play,
    Pause,
    ChevronRight,
    SkipForward,
    RotateCcw,
} from 'lucide-react';

interface Props {
    total: number;
    current: number;
    isPlaying: boolean;
    speed: number; // ms between steps (100–2000)
    onPrev: () => void;
    onNext: () => void;
    onFirst: () => void;
    onLast: () => void;
    onPlay: () => void;
    onPause: () => void;
    onReset: () => void;
    onSpeedChange: (ms: number) => void;
    onSeek: (idx: number) => void;
}

const PlaybackBar: React.FC<Props> = ({
    total,
    current,
    isPlaying,
    speed,
    onPrev,
    onNext,
    onFirst,
    onLast,
    onPlay,
    onPause,
    onReset,
    onSpeedChange,
    onSeek,
}) => {
    const pct = total > 1 ? (current / (total - 1)) * 100 : 0;

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        const idx = Math.round(ratio * (total - 1));
        onSeek(Math.max(0, Math.min(idx, total - 1)));
    };

    return (
        <div className="playback-bar">
            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: 4 }}>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onFirst}
                    disabled={current === 0}
                    title="First step"
                    aria-label="First step"
                >
                    <SkipBack size={14} />
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onPrev}
                    disabled={current === 0}
                    title="Previous step"
                    aria-label="Previous step"
                >
                    <ChevronLeft size={14} />
                </button>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={isPlaying ? onPause : onPlay}
                    disabled={total === 0}
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onNext}
                    disabled={current >= total - 1}
                    title="Next step"
                    aria-label="Next step"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onLast}
                    disabled={current >= total - 1}
                    title="Last step"
                    aria-label="Last step"
                >
                    <SkipForward size={14} />
                </button>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onReset}
                    title="Reset"
                    aria-label="Reset playback"
                >
                    <RotateCcw size={14} />
                </button>
            </div>

            {/* Progress track */}
            <div className="playback-progress">
                <div
                    className="progress-track"
                    onClick={handleTrackClick}
                    role="slider"
                    aria-valuemin={0}
                    aria-valuemax={total - 1}
                    aria-valuenow={current}
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') onPrev();
                        if (e.key === 'ArrowRight') onNext();
                    }}
                >
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-label">
                    {current + 1} / {total}
                </span>
            </div>

            {/* Speed control */}
            <div className="speed-control">
                <span>Speed</span>
                <input
                    type="range"
                    min={100}
                    max={2000}
                    step={100}
                    value={2100 - speed} // invert: higher slider = faster = lower ms
                    onChange={(e) => onSpeedChange(2100 - parseInt(e.target.value, 10))}
                    aria-label="Playback speed"
                />
                <span>{speed}ms</span>
            </div>
        </div>
    );
};

export default PlaybackBar;
