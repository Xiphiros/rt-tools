import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioManager } from '../audio/AudioManager';

interface UseEditorAudioReturn {
    isPlaying: boolean;
    currentTime: number; // Ms
    duration: number;    // Ms
    
    play: () => void;
    pause: () => void;
    seek: (timeMs: number) => void;
    setRate: (rate: number) => void;
    
    // Granular setters
    setMasterVolume: (vol: number) => void;
    setMusicVolume: (vol: number) => void;
    setHitsoundVolume: (vol: number) => void;
    setMetronomeVolume: (vol: number) => void;
    
    load: (file: Blob | File) => Promise<void>;
    manager: AudioManager;
    version: number; 
}

export const useEditorAudio = (): UseEditorAudioReturn => {
    const managerRef = useRef<AudioManager | null>(null);
    if (!managerRef.current) {
        managerRef.current = new AudioManager();
    }
    const manager = managerRef.current;

    const [version, setVersion] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    const rafRef = useRef<number | null>(null);

    const updateUI = useCallback(() => {
        if (manager) {
            setCurrentTime(manager.getCurrentTimeMs());
            setIsPlaying(manager.isAudioPlaying());
            
            if (manager.isAudioPlaying()) {
                rafRef.current = requestAnimationFrame(updateUI);
            } else {
                rafRef.current = null;
            }
        }
    }, [manager]);

    const syncState = useCallback(() => {
        setIsPlaying(manager.isAudioPlaying());
        setCurrentTime(manager.getCurrentTimeMs());
        setDuration(manager.getDurationMs());
        setVersion(v => v + 1);
        
        if (manager.isAudioPlaying() && !rafRef.current) {
            rafRef.current = requestAnimationFrame(updateUI);
        } else if (!manager.isAudioPlaying() && rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, [manager, updateUI]);

    const play = useCallback(() => { manager.play(); syncState(); }, [manager, syncState]);
    const pause = useCallback(() => { manager.pause(); syncState(); }, [manager, syncState]);
    const seek = useCallback((t: number) => { manager.seek(t); syncState(); }, [manager, syncState]);
    const setRate = useCallback((r: number) => { manager.setRate(r); }, [manager]);

    // Volume Proxies
    const setMasterVolume = useCallback((v: number) => manager.setMasterVolume(v), [manager]);
    const setMusicVolume = useCallback((v: number) => manager.setMusicVolume(v), [manager]);
    const setHitsoundVolume = useCallback((v: number) => manager.setHitsoundVolume(v), [manager]);
    const setMetronomeVolume = useCallback((v: number) => manager.setMetronomeVolume(v), [manager]);

    const load = useCallback(async (file: Blob | File) => {
        try {
            const buffer = await file.arrayBuffer();
            await manager.loadAudio(buffer);
            setDuration(manager.getDurationMs());
            seek(0);
        } catch (e) {
            console.error("Hook: Failed to load audio", e);
        }
    }, [manager, seek]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            manager.pause();
        };
    }, [manager]);

    return {
        isPlaying,
        currentTime,
        duration,
        play,
        pause,
        seek,
        setRate,
        setMasterVolume,
        setMusicVolume,
        setHitsoundVolume,
        setMetronomeVolume,
        load,
        manager,
        version
    };
};