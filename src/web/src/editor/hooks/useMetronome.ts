import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';
import { getActiveTimingPoint } from '../utils/timing';
import { TimingPoint } from '../types';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    // Tracks the timestamp (ms) of the last scheduled click
    const nextScheduleTimeRef = useRef<number>(-1);
    const requestRef = useRef<number>();
    
    const ENABLED = settings.metronome;
    const LOOKAHEAD_SEC = 0.1; 
    const SEEK_THRESHOLD_MS = 100;

    const getNextTimingPoint = (time: number, points: TimingPoint[]) => {
        return points.find(p => p.time > time) || null;
    };

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying) {
            nextScheduleTimeRef.current = -1;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        const manager = audio.manager;
        const ctx = manager.getContext();

        const scheduleLoop = () => {
            if (!playback.isPlaying) return;

            const currentSongTime = manager.getCurrentTimeMs();
            
            // Seek Detection
            if (nextScheduleTimeRef.current === -1 || Math.abs(nextScheduleTimeRef.current - currentSongTime) > SEEK_THRESHOLD_MS) {
                nextScheduleTimeRef.current = currentSongTime;
            }

            const windowEnd = currentSongTime + (LOOKAHEAD_SEC * 1000 * playback.playbackRate);
            let iterations = 0;
            
            while (nextScheduleTimeRef.current < windowEnd && iterations < 100) {
                const scanTime = nextScheduleTimeRef.current;
                
                const activeTp = getActiveTimingPoint(scanTime, mapData.timingPoints);
                const nextTp = getNextTimingPoint(scanTime, mapData.timingPoints);
                
                if (!activeTp) {
                    nextScheduleTimeRef.current += 10;
                    iterations++;
                    continue;
                }

                const msPerBeat = 60000 / activeTp.bpm;
                const beatIndex = Math.floor((scanTime - activeTp.time) / msPerBeat) + 1;
                let targetBeatTime = activeTp.time + (beatIndex * msPerBeat);
                
                if (targetBeatTime <= scanTime + 0.1) {
                    targetBeatTime += msPerBeat;
                }

                // Timing Point Boundary Check
                if (nextTp && targetBeatTime >= nextTp.time) {
                    nextScheduleTimeRef.current = nextTp.time;
                    iterations++;
                    continue;
                }

                const contextTime = manager.songTimeToContextTime(targetBeatTime);
                
                if (contextTime >= ctx.currentTime) {
                    const beatNumber = Math.round((targetBeatTime - activeTp.time) / msPerBeat);
                    const isDownbeat = activeTp.meter ? (beatNumber % activeTp.meter === 0) : (beatNumber % 4 === 0);
                    
                    scheduleClick(contextTime, ctx, manager.getMetronomeNode(), isDownbeat);
                }

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
        
        // Lower the base volume of the oscillator so it's not clipping by default
        // The master metronome volume will scale this further
        const peakGain = 0.5;

        envelope.gain.setValueAtTime(0.0, time);
        envelope.gain.linearRampToValueAtTime(peakGain, time + 0.002);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.06);

        // CRITICAL: Clean up nodes after they play to prevent memory leaks/saturation
        osc.onended = () => {
            osc.disconnect();
            envelope.disconnect();
        };
    };
};