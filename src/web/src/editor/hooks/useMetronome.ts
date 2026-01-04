import { useEffect, useRef } from 'react';
import { useEditor } from '../store/EditorContext';

export const useMetronome = () => {
    const { audio, settings, mapData, playback } = useEditor();
    const nextNoteTimeRef = useRef<number>(0);
    
    // Config
    const ENABLED = settings.metronome;
    const LOOKAHEAD = 0.1; // 100ms
    const SCHEDULE_AHEAD = 0.1; // 100ms

    useEffect(() => {
        if (!ENABLED || !playback.isPlaying || !audio.audioContext) return;

        const ctx = audio.audioContext;
        
        const scheduler = () => {
            // Calculate current time in song
            // We use audio.currentTime (which is updated via RAF in useEditorAudio)
            // But for precise scheduling, we should sync with ctx.currentTime if we were purely WebAudio.
            // Since we are hybrid (HTMLAudioElement master), we check playback.currentTime.
            
            const songTimeSec = playback.currentTime / 1000;
            
            // If we just started or seeked, reset next note
            if (Math.abs(songTimeSec - nextNoteTimeRef.current) > 1.0) {
                // Find next beat
                const msPerBeat = 60000 / mapData.bpm;
                const beatSec = msPerBeat / 1000;
                const offsetSec = mapData.offset / 1000;
                
                // Calculate next beat time
                const elapsedBeats = Math.ceil((songTimeSec - offsetSec) / beatSec);
                nextNoteTimeRef.current = offsetSec + (elapsedBeats * beatSec);
            }

            while (nextNoteTimeRef.current < songTimeSec + SCHEDULE_AHEAD) {
                scheduleClick(nextNoteTimeRef.current, ctx);
                
                // Advance
                const msPerBeat = 60000 / mapData.bpm;
                // Currently 1/1 measure only for simplicity, can subdivide later
                // If we want 1/4 ticks, divide duration by 4
                const beatDuration = msPerBeat / 1000;
                nextNoteTimeRef.current += beatDuration; 
            }
            
            if (playback.isPlaying) {
                requestAnimationFrame(scheduler);
            }
        };

        const handle = requestAnimationFrame(scheduler);
        return () => cancelAnimationFrame(handle);
    }, [ENABLED, playback.isPlaying, mapData.bpm, mapData.offset, audio.audioContext]);

    const scheduleClick = (time: number, ctx: AudioContext) => {
        // Since ctx.currentTime is running independently of the HTMLAudioElement,
        // we need to map Song Time -> Context Time.
        // This is tricky without a shared clock. 
        // Simple approach: Just play immediately if we are "close enough".
        // Robust approach: Requires fully WebAudio player.
        
        // For this hybrid editor, we'll try a simplified "Play Now" if within window.
        // Or, we create an oscillator immediately.
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // High pitch for downbeat (measure), low for others?
        // We'll calculate measure index later. For now, standard click.
        osc.frequency.value = 1000;
        
        // Envelope
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    };
};