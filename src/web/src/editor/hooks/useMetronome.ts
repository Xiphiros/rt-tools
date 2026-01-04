import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    // We track the next note time in AudioContext time, not Song time, 
    // to allow precise lookahead scheduling.
    const nextNoteTimeRef = useRef<number>(0);
    
    // Config
    const ENABLED = settings.metronome;
    const LOOKAHEAD = 0.1; // 100ms
    const SCHEDULE_AHEAD = 0.1; // 100ms

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // When starting/resuming, we need to find where we are in terms of beats
        // and align nextNoteTimeRef to the *next* beat in Context Time.
        
        const resetScheduler = () => {
            const currentTime = manager.getCurrentTimeMs() / 1000; // Song Time (Seconds)
            const msPerBeat = 60000 / mapData.bpm;
            const beatSec = msPerBeat / 1000;
            const offsetSec = mapData.offset / 1000;

            // Calculate which beat we are currently past
            // Beat N time = Offset + N * Duration
            const currentBeatIndex = Math.ceil((currentTime - offsetSec) / beatSec);
            const nextBeatSongTime = offsetSec + (currentBeatIndex * beatSec);
            
            // Convert Song Time to Context Time
            // ContextTime = (SongTime - CurrentSongTime) / Rate + CurrentContextTime
            // But simplified: We know when the song *started* in context time inside Manager, but that's private.
            // Easier approach: Delay = (TargetSongTime - CurrentSongTime) / Rate.
            // ScheduleAt = ctx.currentTime + Delay.
            
            const delay = (nextBeatSongTime - currentTime) / playback.playbackRate;
            nextNoteTimeRef.current = ctx.currentTime + delay;
        };

        resetScheduler();

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
    }, [ENABLED, playback.isPlaying, mapData.bpm, mapData.offset, audio.manager, playback.playbackRate]);

    const scheduleClick = (time: number, ctx: AudioContext) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // High pitch tick
        osc.frequency.value = 1200;
        
        // Short envelope
        gain.gain.setValueAtTime(0.0, time);
        gain.gain.linearRampToValueAtTime(0.5, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.055);
    };
};