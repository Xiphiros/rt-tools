import { useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../store/EditorContext';
import { HITSOUND_FILES, HitsoundKey } from '../assets/hitsounds';
import { HitsoundSettings } from '../types';

/**
 * Hook to manage loading and playing one-shot hitsounds.
 * Reuses the main AudioContext from EditorContext to ensure sync.
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
                    // Silent fail for missing files (dev mode mainly)
                    console.warn(`[Hitsounds] Could not load ${key}:`, e);
                }
            });

            await Promise.all(promises);
        };

        loadAll();
    }, [audio.manager]);

    // 2. Playback Function
    const play = useCallback((settings: HitsoundSettings) => {
        const ctx = audio.manager.getContext();
        if (ctx.state === 'suspended') ctx.resume();

        const playSample = (key: string, vol: number) => {
            const buffer = buffersRef.current.get(key);
            if (!buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            const gain = ctx.createGain();
            gain.gain.value = Math.max(0, Math.min(1, vol / 100));
            
            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);
        };

        const set = settings.sampleSet || 'normal';
        
        // Base
        const baseKey = `${set}-hitnormal`;
        playSample(baseKey, settings.volume);

        // Additions
        if (settings.additions?.whistle) playSample(`${set}-hitwhistle`, settings.volume);
        if (settings.additions?.finish) playSample(`${set}-hitfinish`, settings.volume);
        if (settings.additions?.clap) playSample(`${set}-hitclap`, settings.volume);

    }, [audio.manager]);

    return { play };
};