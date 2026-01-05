import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    
    const nextNoteTimeRef = useRef<number>(0);
    const ENABLED = settings.metronome;
    const SCHEDULE_AHEAD = 0.1; // 100ms

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying) return;

        const manager = audio.manager;
        const ctx = manager.getContext();
        
        // 1. Reset Scheduler on Start/Resume
        const resetScheduler = () => {
            const currentTime = manager.getCurrentTimeMs() / 1000;
            const msPerBeat = 60000 / mapData.bpm;
            const beatSec = msPerBeat / 1000;
            const offsetSec = mapData.offset / 1000;

            // Align to next beat
            const currentBeatIndex = Math.ceil((currentTime - offsetSec) / beatSec);
            const nextBeatSongTime = offsetSec + (currentBeatIndex * beatSec);
            
            const delay = (nextBeatSongTime - currentTime) / playback.playbackRate;
            nextNoteTimeRef.current = ctx.currentTime + delay;
        };

        resetScheduler();

        // 2. Scheduler Loop
        const scheduler = () => {
            while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD) {
                scheduleClick(nextNoteTimeRef.current, ctx, manager.getMetronomeNode());
                
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
        
        // Removed settings volume from deps, as we use the persistent node now
    }, [ENABLED, playback.isPlaying, mapData.bpm, mapData.offset, audio.manager, playback.playbackRate]);

    const scheduleClick = (time: number, ctx: AudioContext, outputNode: GainNode) => {
        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        
        osc.connect(envelope);
        // Connect to persistent channel, not destination
        envelope.connect(outputNode);
        
        // High pitch tick
        osc.frequency.value = 1200;
        
        // Short envelope (Gain 1.0 here, regulated by outputNode)
        envelope.gain.setValueAtTime(0.0, time);
        envelope.gain.linearRampToValueAtTime(1.0, time + 0.005);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.055);
    };
};