import { Scene } from 'phaser';

/**
 * RunnerPlayer - Player character for endless runner with jump and slide mechanics
 */
export class RunnerPlayer {
    private scene: Scene;
    public sprite: Phaser.Physics.Arcade.Sprite;
    private readonly JUMP_VELOCITY = -750;
    private readonly DOUBLE_JUMP_VELOCITY = -700; // Slightly weaker for double jump
    private readonly PLAYER_X = 300; // Fixed X position on screen
    private readonly MAX_JUMPS = 2; // Double jump
    
    // Collision box dimensions
    private readonly NORMAL_COLLISION_WIDTH = 40;
    private readonly NORMAL_COLLISION_HEIGHT = 60;
    
    // Collision box offsets
    private readonly NORMAL_OFFSET_X = 375;
    private readonly NORMAL_OFFSET_Y = 270;

    // Simple state to prevent interrupting slide animation
    private isSliding: boolean = false;
    private slideHoldTimer: number = 0;
    private readonly SLIDE_HOLD_DURATION = 750; // milliseconds to hold for platform drop-through
    
    // Jump tracking
    private jumpCount: number = 0;
    private wasOnGround: boolean = true;
    
    // Platform tracking
    private currentPlatform: Phaser.Physics.Arcade.Sprite | null = null;
    private platformY: number = 0;

    // Input tracking
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private spaceKey: Phaser.Input.Keyboard.Key | undefined;
    private wKey: Phaser.Input.Keyboard.Key | undefined;
    private sKey: Phaser.Input.Keyboard.Key | undefined;

    constructor(scene: Scene, groundY: number) {
        this.scene = scene;

        // Create player sprite with physics - using running animation
        // Position sprite visual higher than collision box (collision box stays at groundY via offset)
        this.sprite = scene.physics.add.sprite(this.PLAYER_X, groundY - 250, 'player-run');
        this.sprite.setOrigin(.5, 1); // Bottom center origin

        // Scale down the huge sprite to reasonable size (768x448 -> ~77x45)
        this.sprite.setScale(0.9);

        // Ensure transparency is handled properly
        this.sprite.setAlpha(1);
        this.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
        this.sprite.setTint(0xffffff); // Remove any tinting

        this.sprite.setCollideWorldBounds(false);
        this.sprite.setBounce(0);
        this.sprite.setGravityY(8); // Using scene gravity instead

        // Set body size after scaling
        if (this.sprite.body) {
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            body.setSize(this.NORMAL_COLLISION_WIDTH, this.NORMAL_COLLISION_HEIGHT);
            body.setImmovable(false);
            // Offset collision box down to keep it at original groundY position
            // Sprite visual is 250px higher, so offset collision box down 250px to compensate
            // X offset 375 keeps horizontal alignment, Y offset 270 (20 original + 250 compensation)
            body.setOffset(this.NORMAL_OFFSET_X, this.NORMAL_OFFSET_Y);
        }

        // Setup animation complete listener for slide
        this.setupAnimationListeners();

        // Start with running animation (looping)
        if (this.scene.anims.exists('player-run')) {
            this.sprite.play('player-run', true); // true = loop
        }

        // Setup input
        this.setupInput();
    }

    private setupAnimationListeners(): void {
        // Listen for slide animation completion
        this.sprite.on('animationcomplete', (animation: Phaser.Animations.Animation) => {
            if (animation.key === 'player-slide') {
                // Slide animation finished, return to running
                this.isSliding = false;
                // Re-enable collision detection after slide ends
                if (this.sprite.body) {
                    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                    body.setEnable(true); // Re-enable collision detection
                }
                if (this.scene.anims.exists('player-run')) {
                    this.sprite.play('player-run', true); // true = loop
                }
            }
        });
    }

    private setupInput(): void {
        if (this.scene.input.keyboard) {
            this.cursors = this.scene.input.keyboard.createCursorKeys();
            this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.wKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
            this.sKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        }
    }

    public update(delta: number): void {
        // Handle input
        this.handleInput();

        // Update slide hold timer
        this.updateSlideHoldTimer(delta);

        // Check if player is on a platform
        this.updatePlatformPosition();

        // Track ground state to reset jump count
        const currentlyOnGround = this.isOnGround();
        if (currentlyOnGround && !this.wasOnGround) {
            // Just landed - reset jump count
            this.jumpCount = 0;
        }
        this.wasOnGround = currentlyOnGround;

        // Keep player at fixed X position
        this.sprite.x = this.PLAYER_X;
    }
    
    private updatePlatformPosition(): void {
        if (!this.sprite.body) return;
        
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        
        // Check if player is touching a platform from above
        if (body.touching.down && body.blocked.down && this.currentPlatform && this.currentPlatform.active) {
            const platformBody = this.currentPlatform.body as Phaser.Physics.Arcade.Body;
            if (platformBody) {
                // Update platform Y position (platforms move)
                const platformTop = platformBody.y - platformBody.height / 2;
                this.platformY = platformTop - body.height / 2; // Position player's bottom on platform top
                
                // Check if player's collision box is still over the platform
                const platformLeft = platformBody.x - platformBody.width / 2;
                const platformRight = platformBody.x + platformBody.width / 2;
                const playerX = body.x;
                const playerHalfWidth = body.width / 2;
                
                // If player's collision box is still over the platform, lock Y position
                if (playerX - playerHalfWidth >= platformLeft && playerX + playerHalfWidth <= platformRight) {
                    this.sprite.y = this.platformY;
                    body.setVelocityY(0);
                } else {
                    // Player's collision box has run off the platform
                    this.currentPlatform = null;
                }
            } else {
                this.currentPlatform = null;
            }
        } else if (!body.touching.down || !body.blocked.down) {
            // Not touching anything below, clear platform
            this.currentPlatform = null;
        }
    }
    
    public setOnPlatform(platformSprite: Phaser.Physics.Arcade.Sprite): void {
        if (!this.sprite.body) return;
        
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        const platformBody = platformSprite.body as Phaser.Physics.Arcade.Body;
        
        if (platformBody) {
            this.currentPlatform = platformSprite;
            const platformTop = platformBody.y - platformBody.height / 2;
            this.platformY = platformTop - body.height / 2;
        }
    }

    private handleInput(): void {
        if (!this.cursors && !this.spaceKey) return;

        // Slide input (DOWN arrow or S key) - only trigger if not already sliding
        const slidePressed =
            Phaser.Input.Keyboard.JustDown(this.cursors!.down) ||
            Phaser.Input.Keyboard.JustDown(this.sKey!);

        // Jump input
        const jumpPressed =
            Phaser.Input.Keyboard.JustDown(this.spaceKey!) ||
            Phaser.Input.Keyboard.JustDown(this.cursors!.up) ||
            Phaser.Input.Keyboard.JustDown(this.wKey!);

        // Handle sliding (only if on ground and not already sliding)
        if (slidePressed && this.sprite.body && this.isOnGround() && !this.isSliding) {
            this.slide();
        }

        // Handle jumping (can jump on ground or in air for double jump)
        if (jumpPressed && this.sprite.body && !this.isSliding) {
            if (this.isOnGround()) {
                // First jump from ground
                this.jump();
            } else if (this.jumpCount < this.MAX_JUMPS) {
                // Double jump in air
                this.doubleJump();
            }
        }
    }

    private slide(): void {
        // Play slide animation (non-looping, plays once)
        if (this.scene.anims.exists('player-slide')) {
            this.isSliding = true;
            // Disable collision detection during slide (makes player invincible)
            if (this.sprite.body) {
                const body = this.sprite.body as Phaser.Physics.Arcade.Body;
                body.setEnable(false); // Disable collision detection
            }
            this.sprite.play('player-slide', false); // false = don't loop, play once
        }
    }

    private jump(): void {
        if (this.sprite.body) {
            this.jumpCount = 1;
            this.sprite.setVelocityY(this.JUMP_VELOCITY);
            console.log('Player jumped!');
        }
    }

    private doubleJump(): void {
        if (this.sprite.body) {
            this.jumpCount = 2;
            // Use slightly weaker velocity for double jump
            this.sprite.setVelocityY(this.DOUBLE_JUMP_VELOCITY);
            console.log('Player double jumped!');
        }
    }

    private isOnGround(): boolean {
        if (!this.sprite.body) return false;
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        return body.touching.down || body.blocked.down;
    }

    private updateSlideHoldTimer(delta: number): void {
        const slideHeld = 
            (this.cursors && this.cursors.down.isDown) || 
            (this.sKey && this.sKey.isDown);

        // Update timer when slide key is held
        if (slideHeld) {
            this.slideHoldTimer += delta;
        } else {
            this.slideHoldTimer = 0; // Reset when key is released
        }
    }

    public canDropThroughPlatform(): boolean {
        return this.slideHoldTimer >= this.SLIDE_HOLD_DURATION;
    }

    public getSprite(): Phaser.Physics.Arcade.Sprite {
        return this.sprite;
    }

    public isSlidingState(): boolean {
        return this.isSliding;
    }

    public destroy(): void {
        this.sprite.destroy();
    }
}


