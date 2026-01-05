import { useEffect, useRef, useMemo } from 'react';
import { useEditor } from '../store/EditorContext';
import { useHitsounds } from './useHitsounds';

/**
 * Schedules hitsounds during playback.
 * Uses a lookahead window to schedule WebAudio events precisely.
 */
export const usePlaybackHitsounds = () => {
    const { audio, mapData, playback } = useEditor();
    const { play } = useHitsounds();
    
    // Track the index of the next note to play
    const nextNoteIndexRef = useRef<number>(0);
    
    // Config
    const SCHEDULE_AHEAD = 0.15; // 150ms lookahead

    // Create a fast lookup set for visible layer IDs
    // We memoize this to avoid rebuilding it every frame
    const visibleLayerIds = useMemo(() => {
        const set = new Set<string>();
        mapData.layers.forEach(l => {
            if (l.visible) set.add(l.id);
        });
        return set;
    }, [mapData.layers]);

    useEffect(() => {
        if (!playback.isPlaying) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // 1. Reset Scheduler on Start/Seek
        const resetScheduler = () => {
            const currentTimeMs = manager.getCurrentTimeMs();
            let index = 0;
            while (
                index < mapData.notes.length && 
                mapData.notes[index].time < currentTimeMs
            ) {
                index++;
            }
            nextNoteIndexRef.current = index;
        };

        resetScheduler();

        // 2. Scheduler Loop
        const scheduler = () => {
            const currentTimeMs = manager.getCurrentTimeMs(); // Song Time (ms)
            const lookaheadMs = SCHEDULE_AHEAD * 1000 * playback.playbackRate; // Adjust lookahead for rate
            const contextTime = ctx.currentTime; // Audio Hardware Time (s)

            // Iterate through notes within the window
            while (nextNoteIndexRef.current < mapData.notes.length) {
                const note = mapData.notes[nextNoteIndexRef.current];
                
                // If note is too far in future, stop checking
                if (note.time > currentTimeMs + lookaheadMs) break;

                // Calculate exact context time to play
                const timeUntilNote = (note.time - currentTimeMs) / 1000;
                const delay = timeUntilNote / playback.playbackRate;
                const scheduleTime = contextTime + delay;

                // Only schedule if it's in the future (or very slightly past due)
                // AND if the layer is visible
                if (scheduleTime >= contextTime - 0.05) {
                    if (visibleLayerIds.has(note.layerId)) {
                        play(note.hitsound, scheduleTime);
                    }
                }

                nextNoteIndexRef.current++;
            }
            
            if (manager.isAudioPlaying()) {
                requestAnimationFrame(scheduler);
            }
        };

        const handle = requestAnimationFrame(scheduler);
        return () => cancelAnimationFrame(handle);
    }, [playback.isPlaying, playback.playbackRate, mapData.notes, visibleLayerIds, audio.manager, play]);
};