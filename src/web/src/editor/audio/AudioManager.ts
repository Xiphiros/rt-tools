/**
 * Core Audio Engine for the Editor.
 */

export class AudioManager {
    private ctx: AudioContext;
    
    // Graph Nodes
    private masterGain: GainNode;
    private musicGain: GainNode;
    private hitsoundGain: GainNode;
    private metronomeGain: GainNode;

    // Music State
    private source: AudioBufferSourceNode | null = null;
    private buffer: AudioBuffer | null = null;
    
    // Playback State
    private isPlaying = false;
    private playbackRate = 1.0;
    
    // Time Tracking
    private startContextTime = 0; // When playback started (in ctx.currentTime)
    private startTrackTime = 0;   // Where in the track we started (in seconds)

    constructor() {
        // Initialize Context safely
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // 1. Create Nodes
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.hitsoundGain = this.ctx.createGain();
        this.metronomeGain = this.ctx.createGain();

        // 2. Build Graph
        // Music -> Master
        this.musicGain.connect(this.masterGain);
        // Hitsounds -> Master
        this.hitsoundGain.connect(this.masterGain);
        // Metronome -> Master
        this.metronomeGain.connect(this.masterGain);
        // Master -> Output
        this.masterGain.connect(this.ctx.destination);
    }

    /**
     * Loads raw audio data into the engine.
     */
    async loadAudio(arrayBuffer: ArrayBuffer): Promise<void> {
        this.stop();
        try {
            this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("AudioManager: Failed to decode audio data", e);
            throw e;
        }
    }

    play(): void {
        if ((this.isPlaying && this.source) || !this.buffer) return;
        this.ensureContext();

        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.playbackRate.value = this.playbackRate;
        
        this.source.connect(this.musicGain);

        if (this.startTrackTime >= this.buffer.duration) {
            this.startTrackTime = 0;
        }

        this.startContextTime = this.ctx.currentTime;
        
        this.source.start(0, this.startTrackTime);
        this.isPlaying = true;

        this.source.onended = () => {
            if (this.isPlaying) {
                const predictedEnd = this.startContextTime + (this.buffer!.duration - this.startTrackTime) / this.playbackRate;
                if (this.ctx.currentTime >= predictedEnd - 0.2) {
                    this.isPlaying = false;
                    this.startTrackTime = this.buffer!.duration;
                }
            }
        };
    }

    pause(): void {
        if (!this.isPlaying) return;

        this.stopSource();
        
        const elapsed = this.ctx.currentTime - this.startContextTime;
        this.startTrackTime = this.startTrackTime + (elapsed * this.playbackRate);
        
        this.isPlaying = false;
    }

    seek(timeMs: number): void {
        const timeSeconds = Math.max(0, timeMs / 1000);
        const wasPlaying = this.isPlaying;
        
        if (wasPlaying) {
            this.stopSource();
            this.startTrackTime = timeSeconds;
            this.play();
        } else {
            this.startTrackTime = timeSeconds;
        }
    }

    setRate(rate: number): void {
        if (rate <= 0) return;
        
        if (this.isPlaying) {
            const elapsedCtx = this.ctx.currentTime - this.startContextTime;
            const currentTrackPos = this.startTrackTime + (elapsedCtx * this.playbackRate);

            if (this.source) {
                this.source.playbackRate.value = rate;
            }

            this.startContextTime = this.ctx.currentTime;
            this.startTrackTime = currentTrackPos;
        }

        this.playbackRate = rate;
    }

    // --- VOLUME CONTROL ---

    /**
     * Converts a 0-100 UI value to a 0.0-1.0 Gain value.
     * Uses a square curve (x^2) to approximate audio tapering,
     * which feels much more natural than linear mapping.
     */
    private volumeToGain(volume: number): number {
        const clamped = Math.max(0, Math.min(100, volume));
        const normalized = clamped / 100;
        // x^2 curve: 50% volume -> 0.25 gain (-12dB)
        // x^1 curve: 50% volume -> 0.50 gain (-6dB) -> Usually too loud
        return Math.pow(normalized, 2);
    }

    private setNodeGain(node: GainNode, volume: number) {
        const gain = this.volumeToGain(volume);
        const currentTime = this.ctx.currentTime;
        
        // Use exponential ramp for smooth volume changes (prevents popping)
        // We clamp to a tiny non-zero value because exponentialRampToValueAtTime cannot hit 0
        const safeGain = Math.max(0.0001, gain);
        
        node.gain.cancelScheduledValues(currentTime);
        node.gain.setTargetAtTime(safeGain, currentTime, 0.02);
        
        // If 0, actually snap to 0 after the ramp to ensure silence
        if (gain === 0) {
            node.gain.setValueAtTime(0, currentTime + 0.1);
        }
    }

    setMasterVolume(volume: number) { this.setNodeGain(this.masterGain, volume); }
    setMusicVolume(volume: number) { this.setNodeGain(this.musicGain, volume); }
    setHitsoundVolume(volume: number) { this.setNodeGain(this.hitsoundGain, volume); }
    setMetronomeVolume(volume: number) { this.setNodeGain(this.metronomeGain, volume); }

    // --- ACCESSORS ---

    getHitsoundNode(): GainNode { return this.hitsoundGain; }
    getMetronomeNode(): GainNode { return this.metronomeGain; }

    getCurrentTimeMs(): number {
        if (!this.buffer) return 0;

        if (this.isPlaying) {
            const elapsedCtx = this.ctx.currentTime - this.startContextTime;
            const trackSeconds = this.startTrackTime + (elapsedCtx * this.playbackRate);
            return Math.min(trackSeconds, this.buffer.duration) * 1000;
        }

        return this.startTrackTime * 1000;
    }

    songTimeToContextTime(songTimeMs: number): number {
        if (!this.isPlaying) return this.ctx.currentTime;

        const songTimeSec = songTimeMs / 1000;
        const deltaSec = songTimeSec - this.startTrackTime;
        return this.startContextTime + (deltaSec / this.playbackRate);
    }

    getDurationMs(): number {
        return this.buffer ? this.buffer.duration * 1000 : 0;
    }

    getContext(): AudioContext {
        return this.ctx;
    }

    getBuffer(): AudioBuffer | null {
        return this.buffer;
    }

    isAudioPlaying(): boolean {
        return this.isPlaying;
    }

    private stopSource(): void {
        if (this.source) {
            this.source.onended = null;
            try {
                this.source.stop();
                this.source.disconnect();
            } catch { /* ignore */ }
            this.source = null;
        }
    }

    private stop(): void {
        this.stopSource();
        this.isPlaying = false;
        this.startTrackTime = 0;
    }

    private ensureContext(): void {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}