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
    setVolume: (vol: number) => void;
    
    // Loading
    load: (file: Blob | File) => Promise<void>;
    
    // Direct Access
    manager: AudioManager;
    
    // For React to force re-renders on low-level changes
    version: number; 
}

export const useEditorAudio = (): UseEditorAudioReturn => {
    // Persistent Manager instance
    const managerRef = useRef<AudioManager | null>(null);
    if (!managerRef.current) {
        managerRef.current = new AudioManager();
    }
    const manager = managerRef.current;

    // React State for UI updates
    const [version, setVersion] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    
    // Animation Frame for UI Time Update
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

    // Force sync when playback state changes
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

    const play = useCallback(() => {
        manager.play();
        syncState();
    }, [manager, syncState]);

    const pause = useCallback(() => {
        manager.pause();
        syncState();
    }, [manager, syncState]);

    const seek = useCallback((timeMs: number) => {
        manager.seek(timeMs);
        syncState();
    }, [manager, syncState]);

    const setRate = useCallback((rate: number) => {
        manager.setRate(rate);
    }, [manager]);

    const setVolume = useCallback((vol: number) => {
        manager.setVolume(vol);
    }, [manager]);

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

    // Cleanup
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
        setVolume,
        load,
        manager,
        version
    };
};