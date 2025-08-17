// Player.ts
import { mountDeathStart } from "../components/Death";

type PlayerMode = 'sandboxed' | 'prototype';

class Player {
    private mode: PlayerMode;
    private position = { x: 0, y: 0, z: 0 };

    // vertical physics
    private velocityY = 0;
    private readonly gravity = -9.8;
    private readonly terminalVelocity = -30;
    private gravityRunning = false;
    private gravityRafId: number | null = null;

    // horizontal physics
    private velX = 0;
    private velZ = 0;
    private readonly maxSpeed = 6;
    private readonly groundFriction = 8.0;
    private readonly airFriction = 1.5;
    private physicsRafId: number | null = null;
    private physicsRunning = false;

    // player state
    private isCrouch = false;
    private health: number;
    private isDead = false;

    // jump mechanics
    private canJump = true;
    private readonly jumpCooldown = 300;

    // health regeneration
    private healthRegenIntervalId: number | null = null;
    private readonly healthRegenRate = 5; // health per tick
    private readonly healthRegenInterval = 2000; // ms

    // health synchronization with localStorage
    private healthSyncIntervalId: number | null = null;
    private readonly healthSyncInterval = 1000; // Check every second

    // physics constants
    private readonly maxDeltaTime = 0.05; // 50ms max frame time
    private readonly velocityThreshold = 0.001; // below this, consider velocity as 0
    private readonly ceilingY = 5;

    // disposal flag
    private isDisposed = false;

    constructor(mode: PlayerMode) {
        this.mode = mode;

        // Safe health initialization
        this.health = this.initializeHealth();
        this.isDead = this.health <= 0;

        if (this.isDead) {
            this.Die();
            return;
        }

        // Start systems
        this.startHealthRegen();
        this.startHealthSync(); // Start health synchronization
        this.startPhysics();
        this.updateDOM();
    }

    private initializeHealth(): number {
        try {
            const stored = localStorage.getItem('health');
            if (stored) {
                const parsed = parseInt(stored, 10);
                if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to read health from localStorage:', error);
        }

        // Default health
        const defaultHealth = 100;
        this.saveHealthToStorage(defaultHealth);
        return defaultHealth;
    }

    private saveHealthToStorage(health: number): void {
        try {
            localStorage.setItem('health', health.toString());
        } catch (error) {
            console.warn('Failed to save health to localStorage:', error);
        }
    }

    private startHealthSync(): void {
        if (this.healthSyncIntervalId !== null || this.isDead || this.isDisposed) {
            return;
        }

        this.healthSyncIntervalId = window.setInterval(() => {
            if (this.isDead || this.isDisposed) {
                this.stopHealthSync();
                return;
            }

            try {
                const storedHealth = localStorage.getItem('health');
                if (storedHealth !== null) {
                    const parsedHealth = parseInt(storedHealth, 10);

                    if (Number.isFinite(parsedHealth) && parsedHealth >= 0 && parsedHealth <= 100) {
                        const oldHealth = this.health;
                        this.health = parsedHealth;

                        // If health changed significantly, update DOM and check for death/revival
                        if (Math.abs(oldHealth - this.health) > 0) {
                            console.log(`Health synced from localStorage: ${oldHealth} -> ${this.health}`);

                            // Handle revival case - if player was dead but now has health
                            if (this.isDead && this.health > 0) {
                                console.log('Player revived with health:', this.health);
                                this.revive();
                            }
                            // Handle death case - if player had health but now doesn't
                            else if (!this.isDead && this.health <= 0) {
                                console.log('Player died due to localStorage health change');
                                this.isDead = true;
                                this.Die();
                                return;
                            }

                            this.updateDOM();
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to sync health from localStorage:', error);
            }
        }, this.healthSyncInterval);

        console.log('Health sync started - checking localStorage every', this.healthSyncInterval, 'ms');
    }

    private stopHealthSync(): void {
        if (this.healthSyncIntervalId !== null) {
            clearInterval(this.healthSyncIntervalId);
            this.healthSyncIntervalId = null;
            console.log('Health sync stopped');
        }
    }

    private revive(): void {
        if (this.isDisposed) return;

        console.log('Reviving player with health:', this.health);

        // Reset death state
        this.isDead = false;

        // Reset position and physics
        this.position = { x: 0, y: 0, z: 0 };
        this.velX = 0;
        this.velZ = 0;
        this.velocityY = 0;
        this.canJump = true;
        this.isCrouch = false;

        // Restart systems
        this.startHealthRegen();
        this.startPhysics();

        this.updateDOM();
        console.log('Player successfully revived');
    }

    private startHealthRegen(): void {
        if (this.healthRegenIntervalId !== null || this.isDead || this.isDisposed) {
            return;
        }

        this.healthRegenIntervalId = window.setInterval(() => {
            if (this.isDead || this.isDisposed) {
                this.stopHealthRegen();
                return;
            }

            if (this.health < 100) {
                this.health = Math.min(100, this.health + this.healthRegenRate);
                this.saveHealthToStorage(this.health);
                this.updateDOM();
            }
        }, this.healthRegenInterval);
    }

    private stopHealthRegen(): void {
        if (this.healthRegenIntervalId !== null) {
            clearInterval(this.healthRegenIntervalId);
            this.healthRegenIntervalId = null;
        }

        // Final save
        if (!this.isDisposed) {
            this.saveHealthToStorage(this.health);
        }
    }

    private clampHealth(h: number): number {
        return Math.max(0, Math.min(100, Math.round(h)));
    }

    // Public API methods
    public crouch(): boolean {
        if (this.isDead || this.isDisposed) return false;
        this.isCrouch = !this.isCrouch;
        this.updateDOM();
        return this.isCrouch;
    }

    public isCrouched(): boolean {
        return !this.isDead && !this.isDisposed && this.isCrouch;
    }

    public getPlayerDataInfo() {
        if (this.isDead || this.isDisposed) return { error: 'dead' };

        return {
            mode: this.mode,
            position: { ...this.position },
            velX: this.velX,
            velZ: this.velZ,
            velocityY: this.velocityY,
            gravity: this.gravity,
            physicsRunning: this.physicsRunning,
            gravityRunning: this.gravityRunning,
            isCrouch: this.isCrouch,
            canJump: this.canJump,
            jumpCooldown: this.jumpCooldown,
            health: this.health,
            isDead: this.isDead
        };
    }

    public setMode(mode: PlayerMode): PlayerMode {
        if (this.isDead || this.isDisposed) return this.mode;
        this.mode = mode;
        return this.mode;
    }

    public changePosition(direction: 'x' | 'y' | 'z', value: number) {
        if (this.isDead || this.isDisposed) return this.position;

        // Validate input
        if (!Number.isFinite(value)) {
            console.warn('Invalid position value:', value);
            return this.position;
        }

        this.position[direction] = value;
        if (direction === 'y') {
            this.startGravity();
        }
        this.updateDOM();
        return { ...this.position };
    }

    public getPosition() {
        return { ...this.position };
    }

    // Horizontal movement methods
    public increaseX(accel: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(accel)) {
            return this.position;
        }

        this.velX += accel;
        this.capHorizontalSpeed();
        this.updateDOM();
        return { ...this.position };
    }

    public decreaseX(accel: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(accel)) {
            return this.position;
        }

        this.velX -= accel;
        this.capHorizontalSpeed();
        this.updateDOM();
        return { ...this.position };
    }

    public increaseZ(accel: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(accel)) {
            return this.position;
        }

        this.velZ += accel;
        this.capHorizontalSpeed();
        this.updateDOM();
        return { ...this.position };
    }

    public decreaseZ(accel: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(accel)) {
            return this.position;
        }

        this.velZ -= accel;
        this.capHorizontalSpeed();
        this.updateDOM();
        return { ...this.position };
    }

    private capHorizontalSpeed(): void {
        // Clamp individual axes
        this.velX = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velX));
        this.velZ = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.velZ));

        // Cap combined speed vector
        const magnitude = Math.hypot(this.velX, this.velZ);
        if (magnitude > this.maxSpeed) {
            const scale = this.maxSpeed / magnitude;
            this.velX *= scale;
            this.velZ *= scale;
        }
    }

    // Vertical movement (jumping)
    public increaseY(v: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(v)) {
            return this.position;
        }

        if (this.isCrouch) {
            console.warn('Cannot jump while crouching');
            return this.position;
        }

        if (!this.canJump) {
            return this.position;
        }

        // Slight nudge to avoid ground collision
        if (this.position.y <= 0) {
            this.position.y = 0.0001;
        }

        this.velocityY = v;
        this.canJump = false;
        this.startGravity();
        this.updateDOM();
        return { ...this.position };
    }

    public decreaseY(v: number) {
        if (this.isDead || this.isDisposed || !Number.isFinite(v)) {
            return this.position;
        }

        if (this.isCrouch) {
            console.warn('Cannot move vertically while crouching');
            return this.position;
        }

        this.position.y = Math.max(0, this.position.y - v);
        this.updateDOM();
        this.startGravity();
        return { ...this.position };
    }

    // Physics systems
    private startPhysics(): void {
        if (this.physicsRunning || this.isDead || this.isDisposed) {
            return;
        }

        this.physicsRunning = true;
        let lastTime = performance.now();

        const physicsLoop = (currentTime: number) => {
            if (this.isDead || this.isDisposed) {
                this.physicsRunning = false;
                return;
            }

            let deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;

            // Clamp delta time to prevent physics instability
            if (deltaTime <= 0) deltaTime = 0;
            if (deltaTime > this.maxDeltaTime) deltaTime = this.maxDeltaTime;

            // Determine friction based on ground contact
            const onGround = this.position.y <= 0;
            const friction = onGround ? this.groundFriction : this.airFriction;

            // Apply friction (exponential damping)
            const dampingFactor = Math.max(0, 1 - friction * deltaTime);
            this.velX *= dampingFactor;
            this.velZ *= dampingFactor;

            // Integrate horizontal position
            this.position.x += this.velX * deltaTime;
            this.position.z += this.velZ * deltaTime;

            // Stop micro-movements
            if (Math.abs(this.velX) < this.velocityThreshold) this.velX = 0;
            if (Math.abs(this.velZ) < this.velocityThreshold) this.velZ = 0;

            this.updateDOM();

            if (!this.isDisposed) {
                this.physicsRafId = requestAnimationFrame(physicsLoop);
            }
        };

        this.physicsRafId = requestAnimationFrame(physicsLoop);
    }

    private stopPhysics(): void {
        if (this.physicsRafId !== null) {
            cancelAnimationFrame(this.physicsRafId);
            this.physicsRafId = null;
        }
        this.physicsRunning = false;
    }

    private startGravity(): void {
        if (this.isDead || this.isDisposed || this.gravityRunning) {
            return;
        }

        this.gravityRunning = true;
        let lastTime = performance.now();

        const gravityLoop = (currentTime: number) => {
            if (this.isDead || this.isDisposed) {
                this.gravityRunning = false;
                return;
            }

            let deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // Clamp delta time
            if (deltaTime <= 0) deltaTime = 0;
            if (deltaTime > this.maxDeltaTime) deltaTime = this.maxDeltaTime;

            // Apply gravity
            this.velocityY += this.gravity * deltaTime;

            // Apply terminal velocity
            if (this.velocityY < this.terminalVelocity) {
                this.velocityY = this.terminalVelocity;
            }

            // Update vertical position
            this.position.y += this.velocityY * deltaTime;

            // Ground collision - only when at/below ground and falling
            if (this.position.y <= 0 && this.velocityY <= 0) {
                this.position.y = 0;
                this.velocityY = 0;
                this.gravityRunning = false;

                // Reset jump ability after cooldown
                setTimeout(() => {
                    if (!this.isDisposed && !this.isDead) {
                        this.canJump = true;
                    }
                }, this.jumpCooldown);

                this.updateDOM();
                return;
            }

            // Ceiling collision
            if (this.position.y >= this.ceilingY && this.velocityY > 0) {
                this.position.y = this.ceilingY;
                this.velocityY = 0;
            }

            this.updateDOM();

            if (!this.isDisposed) {
                this.gravityRafId = requestAnimationFrame(gravityLoop);
            }
        };

        this.gravityRafId = requestAnimationFrame(gravityLoop);
    }

    private stopGravity(): void {
        if (this.gravityRafId !== null) {
            cancelAnimationFrame(this.gravityRafId);
            this.gravityRafId = null;
        }
        this.gravityRunning = false;
    }

    // DOM updates
    private updateDOM(): void {
        if (this.isDisposed) return;

        try {
            // Update position display
            this.updatePositionDisplay();

            // Update health display
            this.updateHealthDisplay();
        } catch (error) {
            console.warn('Failed to update DOM:', error);
        }
    }

    private updatePositionDisplay(): void {
        const elements = {
            px: document.getElementById('pos_x'),
            py: document.getElementById('pos_y'),
            pz: document.getElementById('pos_z')
        };

        if (elements.px) elements.px.textContent = this.position.x.toFixed(2);
        if (elements.py) elements.py.textContent = this.position.y.toFixed(2);
        if (elements.pz) elements.pz.textContent = this.position.z.toFixed(2);
    }

    private updateHealthDisplay(): void {
        const container = document.getElementById('health');
        if (!container) return;

        let inner = container.querySelector('#inner') as HTMLElement;
        if (!inner) {
            inner = document.createElement('div');
            inner.id = 'inner';
            container.appendChild(inner);
        }

        let bar = inner.querySelector('.bar') as HTMLElement;
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'bar';
            inner.appendChild(bar);
        }

        const healthPercentage = this.clampHealth(this.health);
        bar.style.width = `${healthPercentage}%`;
        container.style.zIndex = '999999';

        // Update visual state
        if (this.health <= 25) {
            bar.classList.add('low');
        } else {
            bar.classList.remove('low');
        }
    }

    // Health and damage system
    public getHealth(): number {
        return this.health;
    }

    public Damage(amount: number = 10): number {
        if (this.isDead || this.isDisposed) return 0;

        // Validate damage amount
        if (!Number.isFinite(amount) || amount < 0) {
            console.warn('Invalid damage amount:', amount);
            return this.health;
        }

        this.health = this.clampHealth(this.health - amount);
        this.saveHealthToStorage(this.health);
        this.updateDOM();

        if (this.health <= 0 && !this.isDead) {
            this.isDead = true;
            this.Die();
        }

        return this.health;
    }

    public Die(): void {
        if (this.isDisposed) return;

        this.isDead = true;
        this.health = 0;

        // Stop all systems
        this.stopHealthRegen();
        this.stopHealthSync(); // Stop health sync when dead
        this.stopPhysics();
        this.stopGravity();

        this.updateDOM();

        // Handle days countdown
        try {
            const rawDays = localStorage.getItem('days');
            const currentDays = Number.isFinite(Number(rawDays)) ? Number(rawDays) : 5;
            const newDays = Math.max(0, currentDays - 1);
            localStorage.setItem('days', newDays.toString());
        } catch (error) {
            console.warn('Failed to update days in localStorage:', error);
        }

        // Mount death screen
        try {
            const appElement = document.querySelector('#app');
            if (appElement) {
                mountDeathStart(appElement);
            } else {
                console.error('App element not found for death screen');
            }
        } catch (error) {
            console.error('Failed to mount death screen:', error);
        }
    }

    // Cleanup method
    public dispose(): void {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // Stop all systems
        this.stopHealthRegen();
        this.stopHealthSync();
        this.stopPhysics();
        this.stopGravity();

        // Clear all timeouts that might still be pending
        // Note: We can't clear individual timeouts without tracking their IDs,
        // but the disposal flag will prevent any callbacks from executing

        // Final save of health state
        this.saveHealthToStorage(this.health);

        // Clear position to prevent any further physics calculations
        this.position = { x: 0, y: 0, z: 0 };
        this.velX = 0;
        this.velZ = 0;
        this.velocityY = 0;

        // Log disposal for debugging
        console.log('Player instance disposed successfully');
    }

    // Additional utility methods for better game integration
    public heal(amount: number = 10): number {
        if (this.isDead || this.isDisposed) return this.health;

        if (!Number.isFinite(amount) || amount < 0) {
            console.warn('Invalid heal amount:', amount);
            return this.health;
        }

        this.health = this.clampHealth(this.health + amount);
        this.saveHealthToStorage(this.health);
        this.updateDOM();

        return this.health;
    }

    public setHealth(health: number): number {
        if (this.isDead || this.isDisposed) return this.health;

        if (!Number.isFinite(health)) {
            console.warn('Invalid health value:', health);
            return this.health;
        }

        this.health = this.clampHealth(health);
        this.saveHealthToStorage(this.health);
        this.updateDOM();

        // Check if this health change should trigger death
        if (this.health <= 0 && !this.isDead) {
            this.isDead = true;
            this.Die();
        }

        return this.health;
    }

    public resetPosition(): void {
        if (this.isDead || this.isDisposed) return;

        this.position = { x: 0, y: 0, z: 0 };
        this.velX = 0;
        this.velZ = 0;
        this.velocityY = 0;
        this.canJump = true;

        // Stop physics loops to reset state
        this.stopGravity();

        this.updateDOM();
    }

    public isAlive(): boolean {
        return !this.isDead && !this.isDisposed && this.health > 0;
    }

    public getSpeed(): number {
        return Math.hypot(this.velX, this.velZ);
    }

    public isGrounded(): boolean {
        return this.position.y <= 0;
    }

    public isFalling(): boolean {
        return this.velocityY < 0 && this.position.y > 0;
    }

    public isRising(): boolean {
        return this.velocityY > 0;
    }
}

export default Player;