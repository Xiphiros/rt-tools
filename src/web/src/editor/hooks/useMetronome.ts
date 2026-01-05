import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    // We track the next note time in AudioContext time, not Song time, 
    // to allow precise lookahead scheduling.
    const nextNoteTimeRef = useRef<number>(0);
    
    // Config
    const ENABLED = settings.metronome;
    const SCHEDULE_AHEAD = 0.1; // 100ms

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // 1. Reset Scheduler on Start/Resume
        const resetScheduler = () => {
            const currentTime = manager.getCurrentTimeMs() / 1000; // Song Time (Seconds)
            const msPerBeat = 60000 / mapData.bpm;
            const beatSec = msPerBeat / 1000;
            const offsetSec = mapData.offset / 1000;

            // Calculate which beat we are currently past
            const currentBeatIndex = Math.ceil((currentTime - offsetSec) / beatSec);
            const nextBeatSongTime = offsetSec + (currentBeatIndex * beatSec);
            
            // Calculate delay to next beat relative to current playback speed
            const delay = (nextBeatSongTime - currentTime) / playback.playbackRate;
            nextNoteTimeRef.current = ctx.currentTime + delay;
        };

        resetScheduler();

        // 2. Scheduler Loop
        const scheduler = () => {
            // While next note is within the lookahead window
            while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
                scheduleClick(nextNoteTimeRef.current, ctx);
                
                // Advance
                const msPerBeat = 60000 / mapData.bpm;
                const beatDuration = (msPerBeat / 1000) / playback.playbackRate;
                nextNoteTimeRef.current += beatDuration;
            }
            
            if (manager.isAudioPlaying()) {
                requestAnimationFrame(scheduler);
            }
        };

        const handle = requestAnimationFrame(scheduler);
        return () => cancelAnimationFrame(handle);
    }, [ENABLED, playback.isPlaying, mapData.bpm, mapData.offset, audio.manager, playback.playbackRate, settings.metronomeVolume, settings.masterVolume]);

    const scheduleClick = (time: number, ctx: AudioContext) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // High pitch tick
        osc.frequency.value = 1200;
        
        // Calculate Gain
        const master = Math.max(0, Math.min(1, settings.masterVolume / 100));
        const channel = Math.max(0, Math.min(1, settings.metronomeVolume / 100));
        const finalGain = master * channel; // Max 1.0 (actually usually louder, so we cap)

        // Short envelope
        gain.gain.setValueAtTime(0.0, time);
        gain.gain.linearRampToValueAtTime(finalGain, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.055);
    };
};