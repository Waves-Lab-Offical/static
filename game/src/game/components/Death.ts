// Death.ts
import VirtualDocument from "../../utils/Document";
import GameController from "../controllers/MainController";

const log = (msg: string, ...args: any[]) => {
    console.log(`%c[Death.ts] ${msg}`, 'color: red; font-weight: bold;', ...args);
};

/**
 * Death screen built with VirtualDocument.
 *
 * Behavior:
 * - Ensures `days` exists in localStorage (defaults to 5 if missing).
 * - Dynamically updates days display every second from localStorage
 * - On Play:
 *    - if days === 0 -> reset to 5, reload page
 *    - if days > 0  -> reset health to 100, remove death overlay and dynamically import & mount Game
 * - On Back: removes the death overlay
 * 
 * Safety improvements:
 * - Proper error handling for localStorage operations
 * - Input validation and sanitization
 * - Memory leak prevention
 * - Proper cleanup of event listeners
 * - Dynamic days synchronization with localStorage
 */

interface DeathCleanupFunction {
    (): void;
}

interface GameModule {
    default?: {
        mount: (element: HTMLElement) => void;
    };
}

// Constants
const DEFAULT_DAYS = 5;
const DEFAULT_HEALTH = 100;
const APP_SELECTOR = '#app';
const DAYS_SYNC_INTERVAL = 1000; // Check days every second

// Initial HTML template - sanitized and safe
const createInitialTemplate = (): string => `
    <div 
        id="death-screen-root"
        class="h-screen w-screen flex flex-col justify-center items-center text-center relative overflow-hidden"
        role="dialog"
        aria-label="Game Over Screen"
    >
        <video 
            autoplay 
            loop 
            muted 
            playsinline 
            class="absolute top-0 left-0 w-full h-full object-cover -z-10"
            aria-hidden="true"
        >
            <source src="/assets/bg.mp4" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    </div>
`;

const ROOT_SELECTOR = '#death-screen-root';

class DeathScreen {
    private virtualDocument: VirtualDocument | null = null;
    private isInitialized = false;
    private cleanupFunctions: DeathCleanupFunction[] = [];
    private currentDays = 0;
    
    // Days synchronization
    private daysSyncIntervalId: number | null = null;
    private descriptionElement: any = null; // Store reference to description element

    constructor() {
        log('Initializing Death screen...');
        this.initializeScreen();
    }

    private initializeScreen(): void {
        if (this.isInitialized) {
            log('Death screen already initialized');
            return;
        }

        try {
            const initialTemplate = createInitialTemplate();
            this.virtualDocument = new VirtualDocument(initialTemplate, ROOT_SELECTOR);
            this.currentDays = this.ensureDaysInitialized();
            this.createUI();
            this.isInitialized = true;
            log('Death screen initialized successfully');
        } catch (error) {
            log('Failed to initialize death screen:', error);
            throw new Error('Death screen initialization failed');
        }
    }

    private createUI(): void {
        if (!this.virtualDocument) {
            throw new Error('VirtualDocument not initialized');
        }

        // Title
        const titleText = this.virtualDocument.createElement('h1');
        titleText.addClass('text-white text-[50px] mt-10 font-bold');
        titleText.text('You Died');

        // Description - store reference for dynamic updates
        this.descriptionElement = this.virtualDocument.createElement('p');
        this.descriptionElement.addClass('text-white text-[25px] mb-8');
        this.updateDaysDisplay(); // Initial display

        // Button styles
        const buttonStyles = this.getButtonStyles();

        // Back button
        const backButton = this.virtualDocument.createElement('button');
        backButton.addClass(`back-btn ${buttonStyles.secondary}`);
        backButton.text('Go Back');

        // Play button
        const playButton = this.virtualDocument.createElement('button');
        playButton.addClass(`play-btn mt-6 ${buttonStyles.primary}`);
        playButton.text('Play Again');

        // Append elements
        this.virtualDocument.appendChild(titleText);
        this.virtualDocument.appendChild(this.descriptionElement);
        this.virtualDocument.appendChild(backButton);
        this.virtualDocument.appendChild(playButton);

        log('UI elements created successfully');
    }

    private getButtonStyles() {
        return {
            primary: `
                flex items-center justify-center
                px-6 py-3
                font-bold uppercase tracking-wider
                rounded-md
                bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]
                text-red-500
                border border-red-700
                shadow-lg shadow-red-900/40
                hover:from-[#2a0000] hover:to-[#1a0000]
                hover:text-red-400
                active:scale-95
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
            `,
            secondary: `
                flex items-center justify-center
                px-6 py-3
                font-semibold tracking-wide
                rounded-md
                bg-gradient-to-b from-[#111] to-[#000]
                text-gray-300
                border border-gray-700
                shadow-md shadow-black/50
                hover:from-[#222] hover:to-[#111]
                hover:text-white
                active:scale-95
                transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
            `
        };
    }

    private updateDaysDisplay(): void {
        if (!this.descriptionElement) return;
        
        const displayText = `Days Left: ${this.currentDays}`;
        this.descriptionElement.text(displayText);
    }

    private startDaysSync(): void {
        if (this.daysSyncIntervalId !== null) {
            return;
        }

        this.daysSyncIntervalId = window.setInterval(() => {
            try {
                const previousDays = this.currentDays;
                this.currentDays = this.ensureDaysInitialized();
                
                // Only update DOM if days actually changed
                if (previousDays !== this.currentDays) {
                    log(`Days updated: ${previousDays} -> ${this.currentDays}`);
                    this.updateDaysDisplay();
                    
                    // Optional: Handle special cases
                    if (this.currentDays === 0 && previousDays > 0) {
                        log('Days reached zero - game over state');
                    }
                }
            } catch (error) {
                log('Error syncing days from localStorage:', error);
            }
        }, DAYS_SYNC_INTERVAL);

        log('Days sync started - checking localStorage every', DAYS_SYNC_INTERVAL, 'ms');
    }

    private stopDaysSync(): void {
        if (this.daysSyncIntervalId !== null) {
            clearInterval(this.daysSyncIntervalId);
            this.daysSyncIntervalId = null;
            log('Days sync stopped');
        }
    }

    private ensureDaysInitialized(): number {
        try {
            const rawDays = localStorage.getItem('days');

            if (rawDays === null || rawDays === undefined) {
                localStorage.setItem('days', DEFAULT_DAYS.toString());
                return DEFAULT_DAYS;
            }

            const parsedDays = parseInt(rawDays, 10);
            
            if (!Number.isFinite(parsedDays) || parsedDays < 0) {
                localStorage.setItem('days', DEFAULT_DAYS.toString());
                return DEFAULT_DAYS;
            }

            return parsedDays;
        } catch (error) {
            log('Error accessing localStorage, using default days:', error);
            return DEFAULT_DAYS;
        }
    }

    private resetHealthToFull(): void {
        try {
            localStorage.setItem('health', DEFAULT_HEALTH.toString());
            log('Health reset to full:', DEFAULT_HEALTH);
        } catch (error) {
            log('Failed to reset health:', error);
        }
    }

    private async handlePlayAction(): Promise<void> {
        log('Play button clicked');
        
        try {
            // Refresh current days from storage
            this.currentDays = this.ensureDaysInitialized();
            log('Current days on play:', this.currentDays);

            if (this.currentDays === 0) {
                log('Days exhausted, resetting and reloading');
                await this.resetDaysAndReload();
                return;
            }

            // IMPORTANT: Always reset health to full when playing again
            this.resetHealthToFull();
            
            await this.startGame();
        } catch (error) {
            log('Error in play action:', error);
            this.showError('Failed to start game. Please try again.');
        }
    }

    private async resetDaysAndReload(): Promise<void> {
        try {
            localStorage.setItem('days', DEFAULT_DAYS.toString());
            localStorage.setItem('health', DEFAULT_HEALTH.toString()); // Reset health as well
            
            // Use a timeout to ensure localStorage is written
            setTimeout(() => {
                if (typeof window !== 'undefined' && window.location) {
                    window.location.reload();
                }
            }, 100);
        } catch (error) {
            log('Failed to reset game state:', error);
            throw new Error('Failed to reset game');
        }
    }

    private async startGame(): Promise<void> {
        try {
            // Stop days sync before leaving death screen
            this.stopDaysSync();
            
            // Remove death overlay first
            this.removeMountedScreen();

            log('Dynamically importing Game module...');
            
            // Dynamic import with error handling
            const gameModule = await import('./Game') as GameModule;
            const Game = gameModule?.default;

            if (!Game || typeof Game.mount !== 'function') {
                throw new Error('Invalid Game module - missing mount function');
            }

            // Find app root
            const appRoot = document.querySelector(APP_SELECTOR) as HTMLElement;
            if (!appRoot) {
                throw new Error(`Game mount target (${APP_SELECTOR}) not found`);
            }

            log('Mounting Game...');
            Game.mount(appRoot);

            // Initialize GameController after Game is mounted
            const canvas = document.querySelector('canvas');
            if (canvas) {
                new GameController(canvas);
                log('GameController initialized successfully');
            } else {
                log('Warning: Canvas not found for GameController');
            }

            log('Game mounted successfully');

        } catch (error) {
            log('Failed to start game:', error);
            throw new Error('Game startup failed');
        }
    }

    private handleBackAction(): void {
        log('Back button clicked');
        this.stopDaysSync(); // Stop days sync when going back
        this.removeMountedScreen();
    }

    private removeMountedScreen(): void {
        try {
            const mountedScreen = document.querySelector('#death-screen-root');
            if (mountedScreen?.parentElement) {
                mountedScreen.parentElement.removeChild(mountedScreen);
                log('Death screen removed from DOM');
            }
        } catch (error) {
            log('Failed to remove death screen:', error);
        }
    }

    private showError(message: string): void {
        try {
            if (typeof window !== 'undefined' && window.alert) {
                window.alert(message);
            } else {
                console.error(message);
            }
        } catch (error) {
            console.error('Failed to show error message:', error);
        }
    }

    private attachEventListeners(rootElement: HTMLElement): DeathCleanupFunction {
        const backButton = rootElement.querySelector('.back-btn') as HTMLButtonElement;
        const playButton = rootElement.querySelector('.play-btn') as HTMLButtonElement;

        if (!backButton || !playButton) {
            log('Warning: Could not find buttons for event attachment');
            return () => {};
        }

        // Event handlers with error boundaries
        const handleBack = (event: Event) => {
            event.preventDefault();
            try {
                this.handleBackAction();
            } catch (error) {
                log('Error in back handler:', error);
            }
        };

        const handlePlay = async (event: Event) => {
            event.preventDefault();
            
            // Disable button to prevent double-clicks
            playButton.disabled = true;
            playButton.textContent = 'Loading...';
            
            try {
                await this.handlePlayAction();
            } catch (error) {
                log('Error in play handler:', error);
                this.showError('Failed to start game. Please try again.');
            } finally {
                // Re-enable button
                playButton.disabled = false;
                playButton.textContent = 'Play Again';
            }
        };

        // Attach listeners
        backButton.addEventListener('click', handleBack);
        playButton.addEventListener('click', handlePlay);

        // Add keyboard support
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                const target = event.target as HTMLElement;
                if (target === backButton) {
                    handleBack(event);
                } else if (target === playButton) {
                    handlePlay(event);
                }
            } else if (event.key === 'Escape') {
                handleBack(event);
            }
        };

        document.addEventListener('keydown', handleKeyPress);

        log('Event listeners attached successfully');

        // Return cleanup function
        return () => {
            backButton.removeEventListener('click', handleBack);
            playButton.removeEventListener('click', handlePlay);
            document.removeEventListener('keydown', handleKeyPress);
            log('Event listeners cleaned up');
        };
    }

    public mount(rootSelector: string | Element = APP_SELECTOR): DeathCleanupFunction {
        log('Mounting death screen to:', rootSelector);

        if (!this.isInitialized || !this.virtualDocument) {
            throw new Error('Death screen not properly initialized');
        }

        try {
            const rootElement = typeof rootSelector === 'string'
                ? document.querySelector(rootSelector) as HTMLElement
                : rootSelector as HTMLElement;

            if (!rootElement) {
                throw new Error(`Mount target not found: ${rootSelector}`);
            }

            // Refresh days display before mounting
            this.currentDays = this.ensureDaysInitialized();
            this.updateDaysDisplay();

            // Mount the virtual document
            this.virtualDocument.mount(rootElement);
            log('VirtualDocument mounted successfully');

            // Start days synchronization
            this.startDaysSync();

            // Find the mounted screen and attach listeners
            const mountedScreen = rootElement.querySelector('#death-screen-root') as HTMLElement;
            if (!mountedScreen) {
                throw new Error('Mounted death screen not found');
            }

            // Attach event listeners and store cleanup function
            const cleanup = this.attachEventListeners(mountedScreen);
            this.cleanupFunctions.push(cleanup);

            log('Death screen mounted and event listeners attached');

            // Return combined cleanup function
            return () => {
                this.cleanup();
            };

        } catch (error) {
            log('Failed to mount death screen:', error);
            throw error;
        }
    }

    private cleanup(): void {
        log('Cleaning up death screen...');
        
        // Stop days sync
        this.stopDaysSync();
        
        // Execute all cleanup functions
        this.cleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                log('Error during cleanup:', error);
            }
        });
        
        this.cleanupFunctions = [];
        log('Death screen cleanup completed');
    }

    public dispose(): void {
        this.cleanup();
        this.virtualDocument = null;
        this.descriptionElement = null;
        this.isInitialized = false;
    }
}

// Create singleton instance
const deathScreen = new DeathScreen();

/**
 * Mount the death screen and attach listeners.
 * 
 * @param rootSelector - CSS selector or HTMLElement to mount to
 * @returns Cleanup function to remove listeners
 */
export function mountDeathStart(rootSelector: string | Element = APP_SELECTOR): DeathCleanupFunction {
    try {
        return deathScreen.mount(rootSelector);
    } catch (error) {
        console.error('mountDeathStart failed:', error);
        
        // Fallback: show a basic error message
        const rootEl = typeof rootSelector === 'string'
            ? document.querySelector(rootSelector)
            : rootSelector;
            
        if (rootEl) {
            (rootEl as HTMLElement).innerHTML = `
                <div class="h-screen w-screen flex items-center justify-center bg-black text-white">
                    <div class="text-center">
                        <h1 class="text-4xl mb-4">Game Over</h1>
                        <p class="text-xl mb-4">Something went wrong loading the death screen.</p>
                        <button onclick="window.location.reload()" class="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700">
                            Restart Game
                        </button>
                    </div>
                </div>
            `;
        }
        
        return () => {}; // Return empty cleanup function
    }
}

export default deathScreen;