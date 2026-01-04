import { useState, useEffect, useRef, useCallback } from 'react';

interface UseEditorAudioReturn {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    play: () => void;
    pause: () => void;
    seek: (timeMs: number) => void;
    setRate: (rate: number) => void;
    setVolume: (vol: number) => void;
    load: (url: string) => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}

export const useEditorAudio = (): UseEditorAudioReturn => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const rafRef = useRef<number | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Initialize Audio Element purely in memory if not attached to DOM yet
    if (!audioRef.current) {
        audioRef.current = new Audio();
    }

    const updateTime = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime * 1000);
            
            if (!audioRef.current.paused) {
                rafRef.current = requestAnimationFrame(updateTime);
            }
        }
    }, []);

    const play = useCallback(() => {
        audioRef.current?.play().then(() => {
            setIsPlaying(true);
            rafRef.current = requestAnimationFrame(updateTime);
        }).catch(e => console.error("Audio play failed", e));
    }, [updateTime]);

    const pause = useCallback(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const seek = useCallback((timeMs: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = timeMs / 1000;
            setCurrentTime(timeMs);
        }
    }, []);

    const setRate = useCallback((rate: number) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
        }
    }, []);

    const setVolume = useCallback((vol: number) => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, vol));
        }
    }, []);

    const load = useCallback((url: string) => {
        if (audioRef.current) {
            pause();
            audioRef.current.src = url;
            audioRef.current.load();
            
            audioRef.current.onloadedmetadata = () => {
                setDuration((audioRef.current?.duration || 0) * 1000);
            };
        }
    }, [pause]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

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
        audioRef
    };
};