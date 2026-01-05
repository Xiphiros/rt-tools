import { useEffect, useRef } from 'react';
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

    useEffect(() => {
        if (!playback.isPlaying) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // 1. Reset Scheduler on Start/Seek
        const resetScheduler = () => {
            const currentTimeMs = manager.getCurrentTimeMs();
            
            // Find the first note that is AFTER the current time
            // We use a simple linear scan because `mapData.notes` is sorted by time
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
                // Delta (ms) = TargetTime - CurrentTime
                // Delay (s) = Delta / 1000 / PlaybackRate
                const timeUntilNote = (note.time - currentTimeMs) / 1000;
                const delay = timeUntilNote / playback.playbackRate;
                const scheduleTime = contextTime + delay;

                // Only schedule if it's in the future (or very slightly past due)
                if (scheduleTime >= contextTime - 0.05) {
                    play(note.hitsound, scheduleTime);
                }

                nextNoteIndexRef.current++;
            }
            
            if (manager.isAudioPlaying()) {
                requestAnimationFrame(scheduler);
            }
        };

        const handle = requestAnimationFrame(scheduler);
        return () => cancelAnimationFrame(handle);
    }, [playback.isPlaying, playback.playbackRate, mapData.notes, audio.manager, play]);
};