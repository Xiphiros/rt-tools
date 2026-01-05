import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { KEY_TO_ROW } from '../../gameplay/constants';
import { snapTime } from '../utils/timing';
import { useHitsounds } from './useHitsounds';
import { EditorNote, HitsoundSettings } from '../types';

const DEFAULT_HITSOUND: HitsoundSettings = {
    sampleSet: 'normal',
    volume: 100,
    additions: { whistle: false, finish: false, clap: false }
};

interface HeldKey {
    startTime: number; // Raw playhead time
    layerId: string;
}

export const useLiveInput = () => {
    const { playback, mapData, dispatch, settings, activeLayerId } = useEditor();
    const { play } = useHitsounds();
    
    // Track keys currently being held down
    const heldKeys = useRef<Map<string, HeldKey>>(new Map());
    
    // For visual feedback (optional, to show "active" lanes)
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return; // Ignore auto-repeat
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return; // Ignore shortcuts

            const key = e.key.toLowerCase();
            const row = KEY_TO_ROW[key];

            // Only trigger if it's a valid gameplay key AND we are playing
            if (row !== undefined && playback.isPlaying) {
                // Determine if we can record
                const activeLayer = mapData.layers.find(l => l.id === activeLayerId);
                if (activeLayer && activeLayer.locked) return;

                // Play feedback sound
                play(DEFAULT_HITSOUND);

                // Start tracking this hold
                heldKeys.current.set(key, {
                    startTime: playback.currentTime,
                    layerId: activeLayerId
                });
                
                setActiveKeys(prev => new Set(prev).add(key));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            const held = heldKeys.current.get(key);

            if (held) {
                // Clean up state
                heldKeys.current.delete(key);
                setActiveKeys(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });

                // Calculate Timings
                // We use the snap settings to align the note
                const releaseTime = playback.currentTime;
                
                let start = held.startTime;
                let end = releaseTime;

                if (settings.snappingEnabled) {
                    start = snapTime(held.startTime, mapData.timingPoints, settings.snapDivisor);
                    end = snapTime(releaseTime, mapData.timingPoints, settings.snapDivisor);
                }

                // Logic:
                // If the snapped end is <= snapped start, force it to be at least a Tap.
                // If the user held it long enough to span grid lines, make it a Hold.
                
                // Sanity check: Ensure non-negative duration
                let duration = Math.max(0, end - start);
                
                // Minimum hold duration check (e.g. 1/16th note) to prevent accidental tiny holds
                // For now, if duration is 0 after snapping, it's a tap.
                
                const type = duration > 0 ? 'hold' : 'tap';
                const row = KEY_TO_ROW[key];

                const newNote: EditorNote = {
                    id: crypto.randomUUID(),
                    time: start,
                    column: row,
                    key: key,
                    type: type,
                    duration: duration,
                    layerId: held.layerId,
                    hitsound: { ...DEFAULT_HITSOUND }
                };

                dispatch({ type: 'ADD_NOTE', payload: newNote });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [playback.isPlaying, playback.currentTime, mapData, settings, activeLayerId, dispatch, play]);

    return { activeKeys };
};