import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/EditorContext';
import { KEY_TO_ROW } from '../../gameplay/constants';
import { snapTime } from '../utils/timing';
import { useHitsounds } from './useHitsounds';
import { EditorNote } from '../types';

interface HeldKey {
    startTime: number; // Raw playhead time at press
    layerId: string;
}

export const useLiveInput = () => {
    const { playback, mapData, dispatch, settings, activeLayerId, defaultHitsounds } = useEditor();
    const { play } = useHitsounds();
    
    // Track keys currently being held down
    const heldKeys = useRef<Map<string, HeldKey>>(new Map());
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    // STATE REF PATTERN
    // We store the latest state in a ref so the event listener (which is bound once)
    // always has access to the "current" values without needing to re-bind.
    const stateRef = useRef({ 
        playback, 
        mapData, 
        settings, 
        activeLayerId, 
        defaultHitsounds 
    });

    // Update the ref on every render
    useEffect(() => {
        stateRef.current = { 
            playback, 
            mapData, 
            settings, 
            activeLayerId, 
            defaultHitsounds 
        };
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            // Access latest state from Ref
            const { playback, mapData, activeLayerId, defaultHitsounds } = stateRef.current;

            const key = e.key.toLowerCase();
            const row = KEY_TO_ROW[key];

            // Only record if playing
            if (row !== undefined && playback.isPlaying) {
                // Check Lock
                const activeLayer = mapData.layers.find(l => l.id === activeLayerId);
                if (activeLayer && activeLayer.locked) return;

                // Audio Feedback
                play(defaultHitsounds);

                // Track Start Time
                heldKeys.current.set(key, {
                    startTime: playback.currentTime,
                    layerId: activeLayerId
                });
                
                setActiveKeys(prev => new Set(prev).add(key));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const { playback, mapData, settings, defaultHitsounds } = stateRef.current;
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

                // NOTE GENERATION LOGIC
                const releaseTime = playback.currentTime;
                
                let start = held.startTime;
                let end = releaseTime;

                if (settings.snappingEnabled) {
                    start = snapTime(held.startTime, mapData.timingPoints, settings.snapDivisor);
                    end = snapTime(releaseTime, mapData.timingPoints, settings.snapDivisor);
                }

                // If user tapped quickly (start and end snap to same beat), 
                // duration is 0 -> Tap Note.
                // If user held (end > start), duration > 0 -> Hold Note.
                let duration = Math.max(0, end - start);
                
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
                    hitsound: { ...defaultHitsounds }
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
        
        // Dependency array includes ONLY stable references. 
        // We do NOT include 'playback' or 'mapData' here to avoid re-binding.
    }, [dispatch, play]);

    return { activeKeys };
};