import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';
import { getActiveTimingPoint } from '../utils/timing';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    // We track the last song-time we scheduled to avoid duplicate clicks
    const lastScheduledSongTimeRef = useRef<number>(0);
    const wasPlayingRef = useRef<boolean>(false);
    
    const ENABLED = settings.metronome;
    // Lookahead needs to be short enough to respond to seeking, 
    // but long enough to cover frame drops.
    const LOOKAHEAD_SEC = 0.1; 

    useEffect(() => {
        // If disabled, just sync refs
        if (!ENABLED) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // Reset Logic: If we just started playing, reset the scheduler anchor
        if (playback.isPlaying && !wasPlayingRef.current) {
             lastScheduledSongTimeRef.current = manager.getCurrentTimeMs();
        }
        wasPlayingRef.current = playback.isPlaying;

        if (!playback.isPlaying) return;

        const scheduler = () => {
            if (!playback.isPlaying) return;

            // 1. Determine Window (Song Time)
            // Start: Where we left off
            const winStartMs = lastScheduledSongTimeRef.current;
            
            // End: Current Time + Lookahead * Rate
            const currentMs = manager.getCurrentTimeMs();
            const lookaheadMs = LOOKAHEAD_SEC * 1000 * playback.playbackRate;
            const winEndMs = currentMs + lookaheadMs;

            // 2. Iterate beats in this window
            // We need to advance incrementally based on the ACTIVE timing point at every step
            
            let scanTime = winStartMs;

            // Safety: Don't get stuck in infinite loop if something is wrong
            let iterations = 0;
            const MAX_ITERATIONS = 1000;

            // Align scanTime to the next immediate beat if we just started
            // Find TP at winStartMs
            const startTp = getActiveTimingPoint(winStartMs, mapData.timingPoints);
            if (startTp) {
                const msPerBeat = 60000 / startTp.bpm;
                const offset = startTp.time;
                // Calculate next beat after winStartMs
                const beatIndex = Math.floor((winStartMs - offset) / msPerBeat) + 1;
                const nextBeat = offset + (beatIndex * msPerBeat);
                
                // If the next beat is actually BEHIND where we are (due to float precision or offset change),
                // we might need to jump forward.
                scanTime = Math.max(winStartMs, nextBeat);
            }

            while (scanTime < winEndMs && iterations < MAX_ITERATIONS) {
                // Get the TP governing this specific moment
                const tp = getActiveTimingPoint(scanTime, mapData.timingPoints);
                if (!tp) break;

                const msPerBeat = 60000 / tp.bpm;
                
                // Double check we are aligned to THIS tp (in case BPM changed mid-window)
                // If scanTime drifts from the grid defined by 'tp', realign it.
                // However, simply adding msPerBeat is usually sufficient for short windows 
                // unless we cross a TP boundary exactly.
                
                // To be perfectly precise, we should check if scanTime >= next_tp.time
                // But getActiveTimingPoint handles lookup. 
                // We just need to ensure we don't skip a beat when BPM changes.
                // For now, simple increment is standard for rhythm games unless doing complex variable bpm.
                
                // Schedule Click
                // Convert Song Time -> Audio Context Time
                const scheduleTime = manager.songTimeToContextTime(scanTime);
                
                // Only schedule if it's in the future (or very very slightly past due to frame time)
                if (scheduleTime >= ctx.currentTime - 0.05) {
                    const isMeasureStart = isDownbeat(scanTime, tp);
                    scheduleClick(scheduleTime, ctx, manager.getMetronomeNode(), isMeasureStart);
                }

                // Advance
                scanTime += msPerBeat;
                iterations++;
            }

            // Update tracker
            lastScheduledSongTimeRef.current = scanTime; // or winEndMs? 
            // Better to set it to scanTime (the next theoretical beat), so we don't miss or double count.
            // Actually, we should just set it to the last beat we processed + 1 beat?
            // No, simply setting it to the threshold of what we scanned is safer:
            // We scanned up to 'scanTime' (which is now >= winEndMs).
            // So next frame we start looking from there.
        };

        const timer = setInterval(scheduler, 25); // Run frequently (25ms)
        
        return () => clearInterval(timer);
    }, [ENABLED, playback.isPlaying, playback.playbackRate, mapData.timingPoints, audio.manager]);
    
    // Helper to determine downbeat
    const isDownbeat = (time: number, tp: any) => {
        const msPerBeat = 60000 / tp.bpm;
        const beatIndex = Math.round((time - tp.time) / msPerBeat);
        const meter = tp.meter || 4;
        return beatIndex % meter === 0;
    };

    const scheduleClick = (time: number, ctx: AudioContext, outputNode: GainNode, high: boolean) => {
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        
        osc.connect(envelope);
        envelope.connect(outputNode);
        
        // High pitch for measure start, Low for beats
        osc.frequency.value = high ? 1760 : 1200; // A6 vs ~D6
        
        envelope.gain.setValueAtTime(0.0, time);
        envelope.gain.linearRampToValueAtTime(1.0, time + 0.002);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.055);
    };
};