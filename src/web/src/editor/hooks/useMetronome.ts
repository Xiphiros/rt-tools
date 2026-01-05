import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';
import { getActiveTimingPoint } from '../utils/timing';
import { TimingPoint } from '../types';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    // Tracks the timestamp (ms) of the last scheduled click to prevent duplicates
    const nextScheduleTimeRef = useRef<number>(-1);
    const requestRef = useRef<number>();
    
    const ENABLED = settings.metronome;
    const LOOKAHEAD_SEC = 0.1; // 100ms lookahead window
    const SEEK_THRESHOLD_MS = 100; // Reset scheduler if drift > 100ms

    // Helper to find the timing point immediately following the given time
    const getNextTimingPoint = (time: number, points: TimingPoint[]) => {
        // Points are assumed sorted
        return points.find(p => p.time > time) || null;
    };

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying) {
            // Reset state when stopped so we start fresh on play
            nextScheduleTimeRef.current = -1;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const manager = audio.manager;
        const ctx = manager.getContext();

        const scheduleLoop = () => {
            if (!playback.isPlaying) return;

            const currentSongTime = manager.getCurrentTimeMs();
            
            // 1. SEEK DETECTION
            // If we haven't scheduled anything yet, OR if the playhead moved unexpectedly (seek/lag),
            // reset the scheduler to look forward from NOW.
            if (nextScheduleTimeRef.current === -1 || Math.abs(nextScheduleTimeRef.current - currentSongTime) > SEEK_THRESHOLD_MS) {
                nextScheduleTimeRef.current = currentSongTime;
            }

            // 2. WINDOW CALCULATION
            // We want to schedule events from [nextScheduleTimeRef] up to [current + lookahead]
            const windowEnd = currentSongTime + (LOOKAHEAD_SEC * 1000 * playback.playbackRate);
            
            // Iterate through the time window
            // Safety: Limit loop to prevent freezes if BPM is 0 or logic fails
            let iterations = 0;
            while (nextScheduleTimeRef.current < windowEnd && iterations < 100) {
                const scanTime = nextScheduleTimeRef.current;
                
                // Get context at this exact moment
                const activeTp = getActiveTimingPoint(scanTime, mapData.timingPoints);
                const nextTp = getNextTimingPoint(scanTime, mapData.timingPoints);
                
                if (!activeTp) {
                    // No timing info (before start?), advance slightly
                    nextScheduleTimeRef.current += 10;
                    iterations++;
                    continue;
                }

                // Calculate where the NEXT beat falls based on Active TP
                const msPerBeat = 60000 / activeTp.bpm;
                
                // Beat math:
                // Offset = activeTp.time
                // Delta = scanTime - Offset
                // Current Beat Index = floor(Delta / interval)
                // Next Beat Index = Current + 1
                // Target Time = Offset + (Next * interval)
                
                // However, we must ensure we don't re-schedule the beat we just passed.
                // We want the smallest beat time that is > scanTime.
                // If scanTime is exactly on a beat, we want the next one.
                
                const beatIndex = Math.floor((scanTime - activeTp.time) / msPerBeat) + 1;
                let targetBeatTime = activeTp.time + (beatIndex * msPerBeat);
                
                // Precision correction
                // If the calculation puts us <= scanTime due to float precision, force next
                if (targetBeatTime <= scanTime + 0.1) {
                    targetBeatTime += msPerBeat;
                }

                // 3. TIMING POINT BOUNDARY CHECK
                // If the next beat is beyond the start of the Next Timing Point,
                // we should NOT schedule it using the current BPM.
                // Instead, we jump to the Next TP's start time (which is usually a downbeat/reset).
                
                if (nextTp && targetBeatTime >= nextTp.time) {
                    // Align to the new section
                    nextScheduleTimeRef.current = nextTp.time;
                    // We loop again immediately. The next iteration will pick up 'nextTp' as 'activeTp'.
                    // Note: We do NOT schedule the beat here. The next iteration will handle the beat at 'nextTp.time'.
                    iterations++;
                    continue;
                }

                // 4. SCHEDULE
                // Convert to AudioContext time
                const contextTime = manager.songTimeToContextTime(targetBeatTime);
                
                // Only play if it's in the future (plus slight frame buffer to avoid "late" warnings)
                if (contextTime >= ctx.currentTime) {
                    const beatNumber = Math.round((targetBeatTime - activeTp.time) / msPerBeat);
                    const isDownbeat = activeTp.meter ? (beatNumber % activeTp.meter === 0) : (beatNumber % 4 === 0);
                    
                    scheduleClick(contextTime, ctx, manager.getMetronomeNode(), isDownbeat);
                }

                // Advance
                nextScheduleTimeRef.current = targetBeatTime;
                iterations++;
            }

            requestRef.current = requestAnimationFrame(scheduleLoop);
        };

        requestRef.current = requestAnimationFrame(scheduleLoop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [ENABLED, playback.isPlaying, playback.playbackRate, mapData.timingPoints, audio.manager]);

    const scheduleClick = (time: number, ctx: AudioContext, outputNode: GainNode, high: boolean) => {
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        
        osc.connect(envelope);
        envelope.connect(outputNode);
        
        // High pitch for measure start, Low for beats
        osc.frequency.value = high ? 1760 : 1200; 
        
        // Very short crisp click
        envelope.gain.setValueAtTime(0.0, time);
        envelope.gain.linearRampToValueAtTime(1.0, time + 0.002);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.06);
    };
};