import Sound from './Sound';
import Player from './Player';
import Engine from '../engine/Engine';
import Color from '../../utils/Color';
import alert2 from '../components/Alert';

type DifficultyMode = 'easy' | 'hard' | 'extreme';

class GameController {
    private canvas: HTMLCanvasElement;
    private mode: DifficultyMode;
    private player: Player;
    private keyDownListener: ((e: KeyboardEvent) => void) | null = null;
    private keyUpListener: ((e: KeyboardEvent) => void) | null = null;
    private movementKeys: Set<string> = new Set();
    private walkingNoise: Sound | null = null;
    private engine: Engine | null = null;

    // extra global handlers for cleanup
    private onWindowBlur: (() => void) | null = null;
    private onBeforeUnload: (() => void) | null = null;

    // prevent multiple initialization
    private isInitialized = false;
    private isDisposed = false;

    constructor(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }
        
        this.canvas = canvas;
        
        // Safe difficulty parsing with validation
        const difficulty = this.getSafeDifficulty();
        this.mode = difficulty;
        
        this.player = new Player('sandboxed');
        
        // Initialize safely
        this.safeInit();
    }

    private getSafeDifficulty(): DifficultyMode {
        try {
            const stored = localStorage.getItem('difficulty');
            if (stored && ['easy', 'hard', 'extreme'].includes(stored)) {
                return stored as DifficultyMode;
            }
        } catch (error) {
            console.warn('Failed to read difficulty from localStorage:', error);
        }
        
        // Default fallback
        return 'easy';
    }

    private safeInit(): void {
        if (this.isInitialized || this.isDisposed) {
            return;
        }

        try {
            this.main();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize GameController:', error);
            this.dispose();
        }
    }

    public jumpscare(): Sound {
        if (this.isDisposed) {
            throw new Error('GameController is disposed');
        }

        const difficultyVolumeMap: Record<DifficultyMode, number> = {
            easy: 0.3,
            hard: 0.5,
            extreme: 1.0
        };
        
        try {
            const jumpScare = new Sound('/sounds/jumpscare.mp3', difficultyVolumeMap[this.mode]);
            jumpScare.play();
            return jumpScare;
        } catch (error) {
            console.error('Failed to play jumpscare sound:', error);
            // Return a mock sound object to prevent crashes
            return { play: () => {}, stop: () => {} } as Sound;
        }
    }

    public noise(): Sound {
        if (this.isDisposed) {
            throw new Error('GameController is disposed');
        }

        try {
            const noise = new Sound('/sounds/noise.mp3', 1.0);
            noise.loop(true);
            noise.play();
            return noise;
        } catch (error) {
            console.error('Failed to play noise sound:', error);
            // Return a mock sound object to prevent crashes
            return { play: () => {}, stop: () => {}, loop: () => {} } as Sound;
        }
    }

    private stopWalkingNoise(): void {
        if (this.walkingNoise) {
            try {
                this.walkingNoise.stop();
            } catch (error) {
                console.warn('Failed to stop walking noise:', error);
            } finally {
                this.walkingNoise = null;
            }
        }
    }

    private setupListeners(): void {
        if (this.isDisposed) {
            return;
        }

        const jumpSpeedMap: Record<DifficultyMode, number> = {
            easy: 4.3,
            hard: 3.2,
            extreme: 2.3
        };

        // Cleanup old listeners if any
        this.cleanupListeners();

        this.keyDownListener = (e: KeyboardEvent) => {
            if (this.isDisposed || !this.player) {
                return;
            }

            // Prevent handling if player is dead
            if (this.player.getHealth() <= 0) {
                return;
            }

            // Handle only keys we care about — normalize early
            const key = e.key.toLowerCase();

            // Compute speed fresh each event so crouch affects movement immediately
            const normalSpeedMap: Record<DifficultyMode, number> = {
                easy: 0.0662,
                hard: 0.0403,
                extreme: 0.0273
            };

            const crouchSpeedMap: Record<DifficultyMode, number> = {
                easy: 0.0362,
                hard: 0.0203,
                extreme: 0.0173
            };

            const speedMap = this.player.isCrouched() ? crouchSpeedMap : normalSpeedMap;
            const moveSpeed = speedMap[this.mode];
            const jumpSpeed = jumpSpeedMap[this.mode];

            if (!moveSpeed || !jumpSpeed) {
                console.warn('Invalid speed configuration for mode:', this.mode);
                return;
            }

            let moved = false;

            switch (key) {
                case 'arrowup':
                case 'w':
                    e.preventDefault();
                    this.player.increaseX(moveSpeed);
                    this.movementKeys.add('w');
                    moved = true;
                    break;
                case 'arrowdown':
                case 's':
                    e.preventDefault();
                    this.player.decreaseX(moveSpeed);
                    this.movementKeys.add('s');
                    moved = true;
                    break;
                case 'arrowleft':
                case 'a':
                    e.preventDefault();
                    this.player.increaseZ(moveSpeed);
                    this.movementKeys.add('a');
                    moved = true;
                    break;
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    this.player.decreaseZ(moveSpeed);
                    this.movementKeys.add('d');
                    moved = true;
                    break;
                case 'shift':
                case 'c':
                    this.player.crouch();
                    break;
                case 'q':
                case 'x':
                    this.handleExitRequest();
                    return;
                case 'j':
                case ' ':
                case 'space':
                    e.preventDefault();
                    this.handleJumpRequest(jumpSpeed);
                    break;
                case '-':
                    // Debug damage - only allow in development
                    if (process.env.NODE_ENV === 'development') {
                        this.player.Damage();
                    }
                    break;
                default:
                    return;
            }

            if (moved && !this.walkingNoise) {
                this.walkingNoise = this.noise();
            }
        };

        this.keyUpListener = (e: KeyboardEvent) => {
            if (this.isDisposed) {
                return;
            }

            const key = e.key.toLowerCase();
            this.movementKeys.delete(key);
            
            if (key === ' ' || key === 'space') {
                this.movementKeys.delete('spaceAlert');
            }

            if (this.movementKeys.size === 0) {
                this.stopWalkingNoise();
            }
        };

        // Add listeners with error handling
        try {
            document.addEventListener('keydown', this.keyDownListener);
            document.addEventListener('keyup', this.keyUpListener);
        } catch (error) {
            console.error('Failed to add keyboard listeners:', error);
        }

        // Stop walking audio if window loses focus
        this.onWindowBlur = () => {
            this.movementKeys.clear();
            this.stopWalkingNoise();
        };

        this.onBeforeUnload = () => {
            this.stopWalkingNoise();
        };

        try {
            window.addEventListener('blur', this.onWindowBlur);
            window.addEventListener('beforeunload', this.onBeforeUnload);
        } catch (error) {
            console.error('Failed to add window listeners:', error);
        }
    }

    private handleExitRequest(): void {
        try {
            if (window.confirm('Do you want to exit?')) {
                // Check if window.api exists and has exit method
                if (typeof window !== 'undefined' && 
                    'api' in window && 
                    window.api && 
                    typeof window.api.exit === 'function') {
                    window.api.exit();
                } else {
                    // Fallback for browser environment
                    window.close();
                }
            }
        } catch (error) {
            console.error('Failed to handle exit request:', error);
        }
    }

    private handleJumpRequest(jumpSpeed: number): void {
        if (!this.player) {
            return;
        }

        if (this.player.isCrouched()) {
            if (!this.movementKeys.has('spaceAlert')) {
                try {
                    alert2(true, 'You are crouched');
                    this.movementKeys.add('spaceAlert');
                } catch (error) {
                    console.error('Failed to show crouch alert:', error);
                }
            }
            return;
        }

        this.player.increaseY(jumpSpeed);
    }

    private cleanupListeners(): void {
        if (this.keyDownListener) {
            try {
                document.removeEventListener('keydown', this.keyDownListener);
            } catch (error) {
                console.warn('Failed to remove keydown listener:', error);
            }
            this.keyDownListener = null;
        }

        if (this.keyUpListener) {
            try {
                document.removeEventListener('keyup', this.keyUpListener);
            } catch (error) {
                console.warn('Failed to remove keyup listener:', error);
            }
            this.keyUpListener = null;
        }

        if (this.onWindowBlur) {
            try {
                window.removeEventListener('blur', this.onWindowBlur);
            } catch (error) {
                console.warn('Failed to remove blur listener:', error);
            }
            this.onWindowBlur = null;
        }

        if (this.onBeforeUnload) {
            try {
                window.removeEventListener('beforeunload', this.onBeforeUnload);
            } catch (error) {
                console.warn('Failed to remove beforeunload listener:', error);
            }
            this.onBeforeUnload = null;
        }
    }

    /** Cleanly remove listeners, stop sounds and any engine work */
    public dispose(): void {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;

        // Clear movement keys
        this.movementKeys.clear();

        // Stop sounds
        this.stopWalkingNoise();

        // Clean up listeners
        this.cleanupListeners();

        // Clean up engine
        if (this.engine) {
            try {
                if (typeof (this.engine as any).destroy === 'function') {
                    (this.engine as any).destroy();
                } else if (typeof (this.engine as any).dispose === 'function') {
                    (this.engine as any).dispose();
                }
            } catch (error) {
                console.warn('Failed to destroy engine:', error);
            } finally {
                this.engine = null;
            }
        }

        // Clean up player
        if (this.player && typeof (this.player as any).dispose === 'function') {
            try {
                (this.player as any).dispose();
            } catch (error) {
                console.warn('Failed to dispose player:', error);
            }
        }
    }

    public main(): void {
        if (this.isDisposed) {
            throw new Error('Cannot call main on disposed GameController');
        }

        try {
            this.render();
            this.setupListeners();
        } catch (error) {
            console.error('Failed to initialize main:', error);
            throw error;
        }
    }

    private render(): void {
        if (this.isDisposed || !this.canvas) {
            return;
        }

        try {
            this.engine = new Engine(this.canvas);
            this.engine.setBgColor(new Color(0, 0, 0));
        } catch (error) {
            console.error('Failed to initialize engine:', error);
            throw error;
        }
    }

    // Getter methods for safe access
    public getMode(): DifficultyMode {
        return this.mode;
    }

    public getPlayer(): Player {
        return this.player;
    }

    public isGameDisposed(): boolean {
        return this.isDisposed;
    }
}

export default GameController;