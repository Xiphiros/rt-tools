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
    audioContext: AudioContext | null;
    audioBuffer: AudioBuffer | null;
}

export const useEditorAudio = (): UseEditorAudioReturn => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const contextRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

    // Initialize HTML5 Audio
    if (!audioRef.current) {
        audioRef.current = new Audio();
    }

    // Initialize Web Audio Context (Lazily)
    const getContext = useCallback(() => {
        if (!contextRef.current) {
            contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (contextRef.current.state === 'suspended') {
            contextRef.current.resume();
        }
        return contextRef.current;
    }, []);

    const updateTime = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime * 1000);
            if (!audioRef.current.paused) {
                rafRef.current = requestAnimationFrame(updateTime);
            }
        }
    }, []);

    const play = useCallback(() => {
        getContext(); // Ensure context is running
        audioRef.current?.play().then(() => {
            setIsPlaying(true);
            rafRef.current = requestAnimationFrame(updateTime);
        }).catch(e => console.error("Audio play failed", e));
    }, [updateTime, getContext]);

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
        if (audioRef.current) audioRef.current.playbackRate = rate;
    }, []);

    const setVolume = useCallback((vol: number) => {
        if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, vol));
    }, []);

    const load = useCallback(async (url: string) => {
        if (audioRef.current) {
            pause();
            audioRef.current.src = url;
            audioRef.current.load();
            
            // Fetch for WebAudio (Waveform/Metronome sync)
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const ctx = getContext();
                const buffer = await ctx.decodeAudioData(arrayBuffer);
                setAudioBuffer(buffer);
                setDuration(buffer.duration * 1000);
            } catch (e) {
                console.error("Failed to decode audio data", e);
            }
        }
    }, [pause, getContext]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            if (contextRef.current) {
                contextRef.current.close();
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
        audioContext: contextRef.current,
        audioBuffer
    };
};