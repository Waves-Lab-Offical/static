class Sound {
    private audio: HTMLAudioElement;
    public path: string;

    constructor(path: string, volume: number = 1) {
        this.audio = new Audio(path);
        this.path = path;
        this.setVolume(volume);
    }

    // Play the sound asynchronously and handle any playback errors
    public async play(): Promise<void> {
        try {
            await this.audio.play();
        } catch (error) {
            console.error(`Failed to play sound at ${this.path}:`, error);
        }
    }

    // Pause the sound if needed
    public pause(): void {
        this.audio.pause();
    }

    // Stop and reset the audio to start
    public stop(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    // Set volume between 0 (mute) and 1 (max)
    public setVolume(volume: number): void {
        if (volume < 0 || volume > 1) {
            console.warn('Volume must be between 0 and 1. Clamping...');
        }
        this.audio.volume = Math.min(Math.max(volume, 0), 1);
    }

    // Enable or disable looping
    public loop(enable: boolean = true): void {
        this.audio.loop = enable;
    }

    // Check if audio is playing
    public isPlaying(): boolean {
        return !this.audio.paused && !this.audio.ended;
    }
}

export default Sound;