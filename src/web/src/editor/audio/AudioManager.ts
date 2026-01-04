/**
 * Core Audio Engine for the Editor.
 * 
 * DESIGN DECISIONS:
 * 1. Web Audio API (AudioBufferSourceNode):
 *    - HTML5 <audio> tags have variable latency and update rates.
 *    - Decoding the entire file into memory (AudioBuffer) allows sample-accurate seeking and scheduling.
 * 
 * 2. Time Calculation:
 *    - Current Time is calculated mathmatically: (ctx.currentTime - startTime) * rate + offset.
 *    - This prevents the "visual jitter" seen when polling .currentTime of a DOM element.
 * 
 * 3. Rate Changes:
 *    - Changing rate mid-stream requires recalibrating the anchor timestamp to prevent jumps.
 */

export class AudioManager {
    private ctx: AudioContext;
    private source: AudioBufferSourceNode | null = null;
    private gainNode: GainNode;
    
    private buffer: AudioBuffer | null = null;
    
    // Playback State
    private isPlaying = false;
    private playbackRate = 1.0;
    
    // Time Tracking
    private startContextTime = 0; // When playback started (in ctx.currentTime)
    private startTrackTime = 0;   // Where in the track we started (in seconds)
    
    // Volume
    private volume = 0.5;

    constructor() {
        // Initialize Context safely
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
        
        // Master Gain
        this.gainNode = this.ctx.createGain();
        this.gainNode.connect(this.ctx.destination);
        this.gainNode.gain.value = this.volume;
    }

    /**
     * Loads raw audio data into the engine.
     * Use FileReader or fetch to get the ArrayBuffer before passing here.
     */
    async loadAudio(arrayBuffer: ArrayBuffer): Promise<void> {
        // Stop any existing playback
        this.stop();
        
        try {
            // Decode (CPU intensive, usually asynchronous)
            this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("AudioManager: Failed to decode audio data", e);
            throw e;
        }
    }

    play(): void {
        if (this.isPlaying || !this.buffer) return;
        
        this.ensureContext();

        // Create a new source node (Source nodes are one-time use)
        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.playbackRate.value = this.playbackRate;
        this.source.connect(this.gainNode);

        // Calculate anchors
        // If track finished naturally, startTrackTime might be at end, reset if needed
        if (this.startTrackTime >= this.buffer.duration) {
            this.startTrackTime = 0;
        }

        this.startContextTime = this.ctx.currentTime;
        
        // Start playback
        this.source.start(0, this.startTrackTime);
        this.isPlaying = true;

        // Auto-handle natural finish
        this.source.onended = () => {
            // Only consider it a natural stop if we were actually playing
            // (onended also fires when we manually call stop())
            if (this.isPlaying) {
                // Determine if we reached the end or were stopped manually logic is handled in stop()
                // But for natural end, we just update state
                const predictedEnd = this.startContextTime + (this.buffer!.duration - this.startTrackTime) / this.playbackRate;
                
                // Allow a small buffer for timing variations
                if (this.ctx.currentTime >= predictedEnd - 0.1) {
                    this.isPlaying = false;
                    this.startTrackTime = this.buffer!.duration;
                    // Dispatch event listener if we add one later
                }
            }
        };
    }

    pause(): void {
        if (!this.isPlaying) return;

        this.stopSource();
        
        // Update track position to where we stopped
        // New Position = Old Start + (Elapsed Time * Rate)
        const elapsed = this.ctx.currentTime - this.startContextTime;
        this.startTrackTime = this.startTrackTime + (elapsed * this.playbackRate);
        
        this.isPlaying = false;
    }

    /**
     * Seeks to a specific time in milliseconds.
     */
    seek(timeMs: number): void {
        const timeSeconds = Math.max(0, timeMs / 1000);
        
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.stopSource();
        }

        this.startTrackTime = timeSeconds;

        if (wasPlaying) {
            this.play();
        }
    }

    setRate(rate: number): void {
        if (rate <= 0) return;
        
        // If playing, we must adjust anchors so the track doesn't jump
        if (this.isPlaying) {
            // 1. Calculate where we are NOW
            const elapsedCtx = this.ctx.currentTime - this.startContextTime;
            const currentTrackPos = this.startTrackTime + (elapsedCtx * this.playbackRate);

            // 2. Update Source
            if (this.source) {
                this.source.playbackRate.value = rate;
            }

            // 3. Reset anchors to "Start now at current position with new rate"
            this.startContextTime = this.ctx.currentTime;
            this.startTrackTime = currentTrackPos;
        }

        this.playbackRate = rate;
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    /**
     * Returns the precise current time of the track in milliseconds.
     */
    getCurrentTimeMs(): number {
        if (!this.buffer) return 0;

        if (this.isPlaying) {
            const elapsedCtx = this.ctx.currentTime - this.startContextTime;
            const trackSeconds = this.startTrackTime + (elapsedCtx * this.playbackRate);
            return Math.min(trackSeconds, this.buffer.duration) * 1000;
        }

        return this.startTrackTime * 1000;
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
            try {
                this.source.stop();
                this.source.disconnect();
            } catch {
                // Ignore errors if already stopped
            }
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