import { useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../store/EditorContext';
import { HITSOUND_FILES } from '../assets/hitsounds';
import { HitsoundSettings } from '../types';

/**
 * Hook to manage loading and playing one-shot hitsounds.
 * Reuses the main AudioContext from EditorContext to ensure sync.
 */
export const useHitsounds = () => {
    const { audio, settings } = useEditor();
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
    // 'when' is in AudioContext time (seconds). If undefined, plays immediately.
    const play = useCallback((hsSettings: HitsoundSettings, when?: number) => {
        const ctx = audio.manager.getContext();
        if (ctx.state === 'suspended') ctx.resume();

        const playTime = when ?? ctx.currentTime;

        // Calculate Gains
        // Master (0-1) * HitsoundChannel (0-1) * NoteVolume (0-1)
        const masterGain = Math.max(0, Math.min(1, settings.masterVolume / 100));
        const channelGain = Math.max(0, Math.min(1, settings.hitsoundVolume / 100));
        const noteGain = Math.max(0, Math.min(1, hsSettings.volume / 100));
        
        const finalGain = masterGain * channelGain * noteGain;

        // If silent, don't bother playing
        if (finalGain < 0.01) return;

        const playSample = (key: string) => {
            const buffer = buffersRef.current.get(key);
            if (!buffer) return;

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            const gain = ctx.createGain();
            gain.gain.value = finalGain;
            
            source.connect(gain);
            gain.connect(ctx.destination);
            
            // Schedule
            source.start(playTime);
        };

        const set = hsSettings.sampleSet || 'normal';
        
        // Base Hit
        const baseKey = `${set}-hitnormal`;
        playSample(baseKey);

        // Additions
        if (hsSettings.additions?.whistle) playSample(`${set}-hitwhistle`);
        if (hsSettings.additions?.finish) playSample(`${set}-hitfinish`);
        if (hsSettings.additions?.clap) playSample(`${set}-hitclap`);

    }, [audio.manager, settings.masterVolume, settings.hitsoundVolume]);

    return { play };
};