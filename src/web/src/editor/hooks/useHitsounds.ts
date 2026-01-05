import { useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../store/EditorContext';
import { HITSOUND_FILES } from '../assets/hitsounds';
import { HitsoundSettings } from '../types';

/**
 * Hook to manage loading and playing one-shot hitsounds.
 * Reuses the main AudioContext from EditorContext to ensure sync.
 * Now connects to the persistent HitsoundBus for global volume control.
 */
export const useHitsounds = () => {
    const { audio } = useEditor();
    const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
    const loadingRef = useRef<boolean>(false);

    // 1. Load Samples on Mount
    useEffect(() => {
        if (loadingRef.current) return;
        loadingRef.current = true;

        const ctx = audio.manager.getContext();
        
        const loadAll = async () => {
            const promises = Object.entries(HITSOUND_FILES).map(async ([key, url]) => {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const arrayBuffer = await res.arrayBuffer();
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                    buffersRef.current.set(key, audioBuffer);
                } catch (e) {
                    console.warn(`[Hitsounds] Could not load ${key}:`, e);
                }
            });

            await Promise.all(promises);
        };

        loadAll();
    }, [audio.manager]);

    // 2. Playback Function
    // Volume is handled by the Audio Graph (HitsoundBus)
    const play = useCallback((hsSettings: HitsoundSettings, when?: number) => {
        const ctx = audio.manager.getContext();
        if (ctx.state === 'suspended') ctx.resume();

        const playTime = when ?? ctx.currentTime;
        
        // Note-specific volume (0-100)
        // This is distinct from the Global/Channel volume
        const noteGainValue = Math.max(0, Math.min(1, hsSettings.volume / 100));

        const playSample = (key: string) => {
            const buffer = buffersRef.current.get(key);
            if (!buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            // Per-note gain
            const noteGain = ctx.createGain();
            noteGain.gain.value = noteGainValue;
            
            // Connect: Source -> NoteGain -> Persistent Hitsound Bus -> Master -> Dest
            source.connect(noteGain);
            noteGain.connect(audio.manager.getHitsoundNode());
            
            source.start(playTime);
        };

        const set = hsSettings.sampleSet || 'normal';
        
        // Base Hit
        playSample(`${set}-hitnormal`);

        // Additions
        if (hsSettings.additions?.whistle) playSample(`${set}-hitwhistle`);
        if (hsSettings.additions?.finish) playSample(`${set}-hitfinish`);
        if (hsSettings.additions?.clap) playSample(`${set}-hitclap`);

    }, [audio.manager]);

    return { play };
};