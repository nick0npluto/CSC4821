import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { RunnerPlayer } from '../objects/RunnerPlayer';
import { Laser, LaserHeight } from '../objects/Laser';
import { DiamondSpawner } from '../objects/DiamondSpawner';
import { SoftPlatformSpawner } from '../objects/SoftPlatformSpawner';
import { SoftPlatform } from '../objects/SoftPlatform';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background!: Phaser.GameObjects.TileSprite;
    player!: RunnerPlayer;
    ground!: Phaser.GameObjects.Rectangle;
    lasers: Laser[] = [];
    diamondSpawner!: DiamondSpawner;
    platformSpawner!: SoftPlatformSpawner;

    // Game state
    private scrollSpeed: number = 600; // pixels per second
    private distance: number = 0;
    private readonly GROUND_Y = 900;

    // Laser spawning
    private laserSpawnTimer: number = 0;
    private laserSpawnInterval: number = 1000; // Check every 1.5 seconds for random spawn
    private readonly LASER_SPAWN_CHANCE = 0.3; // 60% chance to spawn a laser each interval

    // UI
    private scoreText!: Phaser.GameObjects.Text;
    private score: number = 0;
    private lastDistanceScore: number = 0; // Track last distance-based score to prevent overwriting deductions

    // Collision
    private collisionGroup!: Phaser.Physics.Arcade.Group;
    private isDiamondPaused: boolean = false;
    private laserHitCooldowns: Map<Phaser.Physics.Arcade.Sprite, number> = new Map(); // Track hit cooldowns per laser
    private readonly LASER_HIT_COOLDOWN = 200; // Cooldown in milliseconds between hits from same laser
    
    // Screen flash effect
    private flashOverlay!: Phaser.GameObjects.Rectangle;
    private flashTimer: number = 0;
    private readonly FLASH_DURATION = 200; // Flash duration in milliseconds
    
    // Pause state
    private isPaused: boolean = false;
    private pauseOverlay!: Phaser.GameObjects.Container;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x0a0a1a);
        this.camera.setZoom(0.5); // Zoom out to show more of the game world
        // Move camera down and to the right to show full game
        this.camera.setScroll(400, 200);

        // Create scrolling tiled background
        this.background = this.add.tileSprite(960, 540, 1920, 1080, 'background');
        this.background.setDepth(-100); // Behind everything

        // Create ground
        this.ground = this.add.rectangle(960, this.GROUND_Y, 1920, 4, 0x4a4a4a);
        this.physics.add.existing(this.ground, true); // Static body

        // Create player
        this.player = new RunnerPlayer(this, this.GROUND_Y);

        // Enable collision between player and ground
        this.physics.add.collider(this.player.getSprite(), this.ground);

        // Create collision group for lasers
        this.collisionGroup = this.physics.add.group();

        // Create diamond spawner
        this.diamondSpawner = new DiamondSpawner(this, this.GROUND_Y, this.scrollSpeed);

        // Create platform spawner
        this.platformSpawner = new SoftPlatformSpawner(this, this.GROUND_Y, this.scrollSpeed);

        // Setup collisions ONCE (not every frame!)
        this.physics.add.overlap(
            this.player.getSprite(),
            this.collisionGroup,
            this.handleLaserCollision.bind(this),
            (_playerSprite: any, _laserSprite: any) => {
                // Process callback: only allow collision if laser is active and player is NOT sliding
                const laser = this.lasers.find(l => l.sprite === _laserSprite);
                if (!laser) return false;
                // Only collide if laser is active (not warning) and player is not sliding
                return laser.getIsActive() && !this.player.isSlidingState();
            },
            this
        );

        this.physics.add.overlap(
            this.player.getSprite(),
            this.diamondSpawner.diamondsGroup,
            this.handleDiamondCollision,
            (_playerSprite: any, _diamondSprite: any) => {
                // Process callback: skip collision if player is sliding
                return !this.player.isSlidingState();
            },
            this
        );

        // Setup platform collision with callback to track when player lands on platform
        this.physics.add.collider(
            this.player.getSprite(),
            this.platformSpawner.platformsGroup,
            this.handlePlatformCollision,
            (_playerSprite: any, _platformSprite: any) => {
                // Process callback: skip collision if player is sliding
                return !this.player.isSlidingState();
            },
            this
        );

        // Setup UI
        this.setupUI();
        
        // Setup screen flash overlay (initially invisible)
        this.flashOverlay = this.add.rectangle(960, 540, 1920, 1080, 0xff0000, 0);
        this.flashOverlay.setDepth(1000); // Above everything
        this.flashOverlay.setScrollFactor(0); // Don't scroll with camera
        this.flashOverlay.setVisible(false);

        // Reset game state
        this.distance = 0;
        this.score = 0;
        this.lastDistanceScore = 0;
        this.laserSpawnTimer = 0;
        this.lasers = [];
        this.laserHitCooldowns.clear(); // Clear hit cooldowns
        this.isPaused = false;

        // Setup pause functionality
        this.setupPauseControls();

        EventBus.emit('current-scene-ready', this);
    }

    private setupUI(): void {
        // Score counter in top left
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0).setDepth(1000);

    }

    update(_time: number, delta: number): void
    {
        // Don't update if paused
        if (this.isPaused) {
            return;
        }

        // Scroll the background continuously
        if (this.background) {
            this.background.tilePositionX += (this.scrollSpeed * delta) / 1000;
        }

        // Update player
        this.player.update(delta);

        // Update distance traveled
        this.distance += (this.scrollSpeed * delta) / 1000;

        // Update score (increases at 0.25x the rate of distance)
        // Score increases with distance, but laser hits deduct from it
        const distanceScore = Math.floor(this.distance);
        const distanceIncrease = distanceScore - this.lastDistanceScore;
        if (distanceIncrease > 0) {
            // Score increases at 0.25x the rate of distance
            const scoreIncrease = distanceIncrease * 0.25;
            this.score += scoreIncrease;
            this.lastDistanceScore = distanceScore;
        }
        this.scoreText.setText(`Score: ${Math.floor(this.score)}`);

        // Update laser spawning
        this.updatelaserSpawning(delta);

        // Update lasers
        this.updateLasers(delta);

        // Update diamond spawner
        this.diamondSpawner.update(delta, this.distance);

        // Update platform spawner
        this.platformSpawner.update(delta, this.distance);
        
        // Add diamonds from platforms to diamond collision group
        this.updatePlatformDiamonds();
        
        // Update screen flash effect
        this.updateFlashEffect(delta);
        
        // Update laser hit cooldowns
        this.updateLaserHitCooldowns(delta);
    }
    
    private updateLaserHitCooldowns(delta: number): void {
        // Decrease cooldown timers for all lasers
        for (const [laserSprite, cooldown] of this.laserHitCooldowns.entries()) {
            const newCooldown = cooldown - delta;
            if (newCooldown <= 0) {
                this.laserHitCooldowns.delete(laserSprite);
            } else {
                this.laserHitCooldowns.set(laserSprite, newCooldown);
            }
        }
    }
    
    private updatePlatformDiamonds(): void {
        // Get all platforms and add their diamonds to the diamond group
        if (!this.platformSpawner || !this.diamondSpawner) {
            return;
        }
        
        try {
            const platforms = this.platformSpawner.getPlatforms();
            if (platforms) {
                platforms.forEach((platform: SoftPlatform) => {
                    if (platform && platform.diamond && platform.diamond.sprite) {
                        if (!this.diamondSpawner.diamondsGroup.contains(platform.diamond.sprite)) {
                            this.diamondSpawner.diamondsGroup.add(platform.diamond.sprite);
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error updating platform diamonds:', error);
        }
    }


    private updatelaserSpawning(delta: number): void {
        this.laserSpawnTimer += delta;

        if (this.laserSpawnTimer >= this.laserSpawnInterval) {
            // Random chance to spawn laser (not always)
            if (Math.random() < this.LASER_SPAWN_CHANCE) {
                this.spawnLaser();
            }
            this.laserSpawnTimer = 0;
        }
    }

    private spawnLaser(): void {
        // Get possible Y positions: ground diamond position and platform diamond positions
        const possibleYPositions: number[] = [];
        
        // Ground diamond position
        possibleYPositions.push(this.GROUND_Y - 15);
        
        // Get active platform diamond positions
        const platforms = this.platformSpawner.getPlatforms();
        platforms.forEach((platform: SoftPlatform) => {
            if (platform.diamond && platform.diamond.sprite) {
                // Get actual diamond Y position from its sprite
                const diamondY = platform.diamond.sprite.y;
                possibleYPositions.push(diamondY);
            }
        });
        
        // Randomly select one of the possible Y positions
        if (possibleYPositions.length === 0) {
            // Fallback to ground position if no platforms with diamonds
            possibleYPositions.push(this.GROUND_Y - 15);
        }
        
        const selectedY = possibleYPositions[Math.floor(Math.random() * possibleYPositions.length)];
        
        // Laser constructor expects groundY, and sets y = groundY - 15 for 'ground' height
        // So to get laser at selectedY, we need to pass selectedY + 15 as groundY
        const height: LaserHeight = 'ground';
        const x = 2000; // Spawn off-screen to the right

        const laser = new Laser(this, x, selectedY + 15, height, this.scrollSpeed);
        this.lasers.push(laser);

        // Add to collision group
        this.collisionGroup.add(laser.sprite);

        console.log(`Spawned ${height} laser at x=${x}, y=${selectedY} (diamond position)`);
    }

    private updateLasers(delta: number): void {
        // Update all lasers and remove off-screen ones
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.update(delta);

            if (laser.isOffScreen()) {
                this.collisionGroup.remove(laser.sprite);
                laser.destroy();
                this.lasers.splice(i, 1);
            }
        }
    }

    private handleLaserCollision(playerSprite: any, laserSprite: any): void {
        // Process callback already checks if laser is active, but double-check here
        const laser = this.lasers.find(l => l.sprite === laserSprite);
        if (!laser || !laser.getIsActive()) {
            // Laser is not active, don't trigger hit
            return;
        }
        
        // Check if this laser is on cooldown
        const currentCooldown = this.laserHitCooldowns.get(laserSprite);
        if (currentCooldown && currentCooldown > 0) {
            // Still on cooldown, skip this hit
            return;
        }
        
        // Set cooldown for this laser
        this.laserHitCooldowns.set(laserSprite, this.LASER_HIT_COOLDOWN);
        
        console.log('LASER HIT DETECTED!', playerSprite, laserSprite);
        
        // Reduce score by half (works even for low scores like 10 -> 5)
        const oldScore = this.score;
        this.score = Math.max(0, Math.floor(this.score / 2)); // Don't go below 0
        this.scoreText.setText(`Score: ${this.score}`);
        
        // Flash screen red
        this.flashScreen();
        
        console.log(`Score reduced from ${oldScore} to ${this.score}`);
    }
    
    private flashScreen(): void {
        // Show red flash overlay
        this.flashOverlay.setVisible(true);
        this.flashOverlay.setAlpha(0.3); // Light red flash (30% opacity)
        this.flashTimer = this.FLASH_DURATION;
    }

    private updateFlashEffect(delta: number): void {
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;

            // Fade out the flash
            const alpha = Math.max(0, (this.flashTimer / this.FLASH_DURATION) * 0.3);
            this.flashOverlay.setAlpha(alpha);

            // Hide when timer expires
            if (this.flashTimer <= 0) {
                this.flashOverlay.setVisible(false);
                this.flashOverlay.setAlpha(0);
            }
        }
    }

    public deductScore(points: number): void {
        // Deduct points from score (called when skipping challenges, etc.)
        const oldScore = this.score;
        this.score = Math.max(0, this.score - points); // Don't go below 0
        this.scoreText.setText(`Score: ${Math.floor(this.score)}`);

        console.log(`Score deducted: ${oldScore} - ${points} = ${this.score}`);

        // Flash screen red to indicate penalty
        this.flashScreen();
    }

    private handlePlatformCollision(
        playerSprite: any,
        platformSprite: any
    ): void {
        const playerBody = (playerSprite as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
        const platformBody = (platformSprite as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
        
        // Check if player is landing on top of platform (touching from above)
        if (playerBody && platformBody && playerBody.touching.down) {
            // Check if player's bottom is near platform's top
            const playerBottom = playerBody.y + playerBody.height / 2;
            const platformTop = platformBody.y - platformBody.height / 2;
            
            if (playerBottom >= platformTop - 10 && playerBottom <= platformTop + 10) {
                // Player is landing on platform
                this.player.setOnPlatform(platformSprite as Phaser.Physics.Arcade.Sprite);
            }
        }
    }

    private handleDiamondCollision(_player: any, diamondSprite: any): void {
        // Prevent multiple pause triggers from the same collision
        if (this.isDiamondPaused) {
            return;
        }

        this.isDiamondPaused = true;
        console.log('handleDiamondCollision called!', _player, diamondSprite);

        const sprite = diamondSprite as Phaser.Physics.Arcade.Sprite;
        const tier = sprite.getData('tier');
        const challengeId = sprite.getData('challengeId');

        console.log(`Diamond collected! Tier: ${tier}, Challenge: ${challengeId}`);

        // Remove the diamond
        this.diamondSpawner.removeDiamond(sprite);

        // Pause the game
        this.scene.pause();

        // Load the problem data based on challengeId
        const challenges = this.cache.json.get('challenges');
        const challenge = challenges.challenges.find((c: any) => c.id === challengeId);

        if (!challenge) {
            console.error(`Challenge not found: ${challengeId}`);
            this.isDiamondPaused = false;
            this.scene.resume();
            return;
        }

        // Convert challenge data to LeetCodeProblem format
        const problem = this.convertChallengeToProblem(challenge, tier);

        // Launch LeetCode Challenge Scene
        this.scene.launch('LeetCodeChallenge', {
            problem: problem,
            distanceTraveled: this.distance
        });

        // Listen for when challenge scene closes to reset pause state
        this.scene.get('LeetCodeChallenge').events.once('shutdown', () => {
            this.isDiamondPaused = false;
        });
    }

    private setupPauseControls(): void {
        // ESC key to pause/unpause
        this.input.keyboard?.on('keydown-ESC', () => {
            if (this.isDiamondPaused) {
                return; // Don't pause if diamond challenge is active
            }
            this.togglePause();
        });
    }

    private togglePause(): void {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    private pauseGame(): void {
        this.isPaused = true;
        this.physics.pause();
        
        // Create pause overlay
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        this.pauseOverlay = this.add.container(centerX, centerY);
        this.pauseOverlay.setDepth(10000);

        // Semi-transparent backdrop
        const backdrop = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.8);
        backdrop.setOrigin(0.5);
        this.pauseOverlay.add(backdrop);

        // Pause panel
        const panel = this.add.rectangle(0, 0, 400, 300, 0x000000);
        panel.setStrokeStyle(3, 0x00ff00);
        this.pauseOverlay.add(panel);

        // Pause title
        const title = this.add.text(0, -80, '> PAUSED', {
            fontSize: '36px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 1
        });
        title.setOrigin(0.5);
        this.pauseOverlay.add(title);

        // Resume button
        const resumeBtn = this.add.text(0, 20, '> RESUME (ESC)', {
            fontSize: '20px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        resumeBtn.setOrigin(0.5);
        resumeBtn.setInteractive({ useHandCursor: true });
        resumeBtn.on('pointerdown', () => this.resumeGame());
        resumeBtn.on('pointerover', () => {
            resumeBtn.setStyle({ strokeThickness: 1 });
        });
        resumeBtn.on('pointerout', () => {
            resumeBtn.setStyle({ strokeThickness: 0.5 });
        });
        this.pauseOverlay.add(resumeBtn);

        // Quit button
        const quitBtn = this.add.text(0, 70, '> QUIT TO MENU', {
            fontSize: '18px',
            color: '#ff0000',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#ff0000',
            strokeThickness: 0.5
        });
        quitBtn.setOrigin(0.5);
        quitBtn.setInteractive({ useHandCursor: true });
        quitBtn.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
        quitBtn.on('pointerover', () => {
            quitBtn.setStyle({ strokeThickness: 1 });
        });
        quitBtn.on('pointerout', () => {
            quitBtn.setStyle({ strokeThickness: 0.5 });
        });
        this.pauseOverlay.add(quitBtn);
    }

    private resumeGame(): void {
        this.isPaused = false;
        this.physics.resume();
        
        // Remove pause overlay
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null as any;
        }
    }

    private convertChallengeToProblem(challenge: any, tier: string): any {
        // Convert snake_case to camelCase for function name
        const functionName = this.snakeToCamel(challenge.functionName);

        // Map tier to difficulty
        const difficultyMap: { [key: string]: { level: number, label: string } } = {
            'white': { level: 1, label: 'Easy' },
            'blue': { level: 5, label: 'Medium' },
            'black': { level: 9, label: 'Hard' }
        };

        const difficulty = difficultyMap[tier] || { level: 1, label: 'Easy' };

        // Extract problem number from ID (e.g., "white_01" -> 1)
        const numberMatch = challenge.id.match(/_(\d+)$/);
        const problemNumber = numberMatch ? parseInt(numberMatch[1]) : 1;

        // Convert simple test cases to detailed examples
        const examples = challenge.testCases.slice(0, 2).map((tc: any, index: number) => ({
            input: Array.isArray(tc.input)
                ? `[${tc.input.map((v: any) => JSON.stringify(v)).join(', ')}]`
                : JSON.stringify(tc.input),
            output: JSON.stringify(tc.expected),
            explanation: index === 0 ? challenge.example : undefined
        }));

        // Generate constraints based on test cases
        const constraints = [
            'Follow the function signature provided',
            'Handle all test cases correctly',
            'Consider edge cases'
        ];

        // Generate starter code
        const parameters = this.extractParameters(challenge.testCases[0]?.input);
        const starterCode = `var ${functionName} = function(${parameters.join(', ')}) {\n    // Write your solution here\n    \n};`;
        const starterCodePython = `def ${challenge.functionName}(${parameters.join(', ')}):\n    # Write your solution here\n    pass`;

        return {
            id: challenge.id,
            number: problemNumber,
            title: challenge.title,
            difficulty: difficulty.level,
            leetcodeDifficulty: difficulty.label,
            topic: this.inferTopic(challenge.title, challenge.description),
            topics: [this.inferTopic(challenge.title, challenge.description)],
            description: challenge.description,
            examples: examples,
            constraints: constraints,
            hints: [],
            functionName: functionName,
            functionSignature: `@param varies\n@return varies`,
            parameters: parameters,
            returnType: 'any',
            starterCode: starterCode,
            starterCodePython: starterCodePython,
            testCases: challenge.testCases,
            hiddenTestCases: [],
            reward: challenge.reward,
            companies: []
        };
    }

    private snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    private extractParameters(input: any): string[] {
        if (Array.isArray(input)) {
            return input.map((_, index) => String.fromCharCode(97 + index)); // a, b, c, ...
        }
        return ['n'];
    }

    private inferTopic(title: string, description: string): string {
        const text = (title + ' ' + description).toLowerCase();

        if (text.includes('array') || text.includes('list')) return 'Arrays';
        if (text.includes('string')) return 'Strings';
        if (text.includes('hash') || text.includes('duplicate')) return 'Hash Table';
        if (text.includes('binary') || text.includes('search')) return 'Binary Search';
        if (text.includes('sort')) return 'Sorting';
        if (text.includes('parenthes')) return 'Stack';
        if (text.includes('fibonacci') || text.includes('factorial')) return 'Recursion';
        if (text.includes('path') || text.includes('subsequence')) return 'Dynamic Programming';
        if (text.includes('word') || text.includes('regex')) return 'String Matching';

        return 'General';
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
