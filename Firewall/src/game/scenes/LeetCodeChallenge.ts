import { Scene } from 'phaser';
import { LeetCodeProblem, TestResult } from '../types/LeetCodeTypes';
import * as monaco from 'monaco-editor';

export class LeetCodeChallenge extends Scene {
    private problem!: LeetCodeProblem;
    private distanceTraveled!: number;
    private editor!: monaco.editor.IStandaloneCodeEditor;
    private editorContainer!: HTMLElement;
    private failedAttempts: number = 0;
    private readonly MAX_ATTEMPTS: number = 3;

    constructor() {
        super('LeetCodeChallenge');
    }

    create(data: { problem: LeetCodeProblem, distanceTraveled: number }) {
        this.problem = data.problem;
        this.distanceTraveled = data.distanceTraveled;
        this.failedAttempts = 0; // Reset attempts for each new challenge

        console.log('LeetCodeChallenge launched with problem:', this.problem);

        // Create semi-transparent backdrop
        this.createBackdrop();

        // Create UI layout
        this.createChallengeUI();

        // Initialize Monaco editor
        this.initializeMonacoEditor();

        // Listen for resize events
        this.scale.on('resize', this.handleResize, this);
    }

    private createBackdrop() {
        // Full black backdrop
        const backdrop = this.add.rectangle(
            0, 0,
            this.scale.width,
            this.scale.height,
            0x000000, 0.95
        );
        backdrop.setOrigin(0, 0);
        backdrop.setInteractive(); // Block input to game scene

        // Add subtle matrix-style grid pattern
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x00ff00, 0.1);
        
        const gridSize = 50;
        for (let x = 0; x < this.scale.width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.scale.height);
        }
        for (let y = 0; y < this.scale.height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.scale.width, y);
        }
        graphics.strokePath();
    }

    private createChallengeUI() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Main panel - pure black with green border
        const panelWidth = this.scale.width - 80;
        const panelHeight = this.scale.height - 80;

        // Outer glow effect
        const glow = this.add.rectangle(centerX, centerY, panelWidth + 4, panelHeight + 4, 0x00ff00, 0.2);
        glow.setStrokeStyle(2, 0x00ff00, 0.5);

        // Main panel - deep black
        const panel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x000000);
        panel.setStrokeStyle(2, 0x00ff00);

        // Add "FIREWALL" title at top
        const titleText = this.add.text(centerX, centerY - panelHeight / 2 + 25, 'FIREWALL', {
            fontSize: '32px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 1
        });
        titleText.setOrigin(0.5, 0.5);

        // Add decorative lines
        const lineGraphics = this.add.graphics();
        lineGraphics.lineStyle(1, 0x00ff00, 0.5);
        lineGraphics.moveTo(centerX - panelWidth / 2 + 20, centerY - panelHeight / 2 + 50);
        lineGraphics.lineTo(centerX + panelWidth / 2 - 20, centerY - panelHeight / 2 + 50);

        // Split into two columns: left = problem description, right = code editor
        const leftX = centerX - panelWidth / 4;
        const rightX = centerX + panelWidth / 4;
        const columnWidth = panelWidth / 2 - 50;

        // Divider line between columns
        lineGraphics.lineStyle(1, 0x00ff00, 0.3);
        lineGraphics.moveTo(centerX, centerY - panelHeight / 2 + 60);
        lineGraphics.lineTo(centerX, centerY + panelHeight / 2 - 100);

        // === LEFT COLUMN: Problem Description ===
        this.createProblemPanel(leftX, centerY + 20, columnWidth, panelHeight - 120);

        // === RIGHT COLUMN: Code Editor ===
        this.createEditorPanel(rightX, centerY + 20, columnWidth, panelHeight - 120);

        // === CONTROL BUTTONS AT BOTTOM ===
        this.createControlButtons(centerX, centerY + panelHeight / 2 - 60);
    }

    private createProblemPanel(x: number, y: number, width: number, height: number) {
        const topY = y - height / 2 + 20;

        // Panel background - very dark with subtle green border
        const panelBg = this.add.rectangle(x, y, width, height, 0x0a0a0a);
        panelBg.setStrokeStyle(1, 0x00ff00, 0.3);

        // Title - bright green matrix style
        const title = this.add.text(x, topY,
            `> ${this.problem.number}. ${this.problem.title}`, {
            fontSize: '22px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            wordWrap: { width: width - 30 }
        });
        title.setOrigin(0.5, 0);

        // Difficulty and Topic badges - matrix style
        const badgeY = topY + title.height + 20;
        const difficultyColor = this.getDifficultyColor(this.problem.difficulty);
        const difficultyBadge = this.add.text(x - 70, badgeY,
            `[${this.problem.leetcodeDifficulty}]`, {
            fontSize: '12px',
            color: difficultyColor,
            fontFamily: 'Courier New, monospace',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            stroke: difficultyColor,
            strokeThickness: 1
        });
        difficultyBadge.setOrigin(0.5, 0);

        const topicBadge = this.add.text(x + 70, badgeY,
            `[${this.problem.topic}]`, {
            fontSize: '12px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
            stroke: '#00ff00',
            strokeThickness: 1
        });
        topicBadge.setOrigin(0.5, 0);

        // Description - green text on black
        let contentY = badgeY + 40;
        const description = this.add.text(x - width / 2 + 20, contentY,
            `> ${this.problem.description}`, {
            fontSize: '15px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            wordWrap: { width: width - 40 },
            lineSpacing: 6
        });
        description.setOrigin(0, 0);

        // Examples - matrix terminal style
        contentY += description.height + 25;
        const examplesTitle = this.add.text(x - width / 2 + 20, contentY,
            '> EXAMPLES:', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        examplesTitle.setOrigin(0, 0);

        contentY += examplesTitle.height + 15;
        this.problem.examples.forEach((example, index) => {
            const exampleText = this.add.text(x - width / 2 + 30, contentY,
                `> Example ${index + 1}:\n` +
                `  Input: ${example.input}\n` +
                `  Output: ${example.output}` +
                (example.explanation ? `\n  Explanation: ${example.explanation}` : ''), {
                fontSize: '13px',
                color: '#00ff00',
                fontFamily: 'Courier New, monospace',
                backgroundColor: '#000000',
                padding: { x: 10, y: 8 },
                stroke: '#00ff00',
                strokeThickness: 0.3,
                wordWrap: { width: width - 70 }
            });
            exampleText.setOrigin(0, 0);
            contentY += exampleText.height + 12;
        });

        // Constraints - terminal style
        contentY += 10;
        const constraintsTitle = this.add.text(x - width / 2 + 20, contentY,
            '> CONSTRAINTS:', {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        constraintsTitle.setOrigin(0, 0);

        contentY += constraintsTitle.height + 15;
        const constraintsText = this.add.text(x - width / 2 + 30, contentY,
            this.problem.constraints.map(c => `  > ${c}`).join('\n'), {
            fontSize: '12px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            wordWrap: { width: width - 60 },
            stroke: '#00ff00',
            strokeThickness: 0.2
        });
        constraintsText.setOrigin(0, 0);
    }

    private createEditorPanel(x: number, y: number, width: number, height: number) {
        const topY = y - height / 2 + 20;

        // Panel background - very dark with green border
        const panelBg = this.add.rectangle(x, y, width, height, 0x0a0a0a);
        panelBg.setStrokeStyle(1, 0x00ff00, 0.3);
        panelBg.setDepth(1); // Lower depth so it stays behind

        // Editor title - matrix style
        const editorTitle = this.add.text(x, topY,
            '> CODE EDITOR [PYTHON]', {
            fontSize: '18px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        editorTitle.setOrigin(0.5, 0);
        editorTitle.setDepth(10002); // High depth for visibility

        // Monaco editor will be mounted here as DOM element
    }

    private initializeMonacoEditor() {
        // Initialize Python starter code
        const pythonCode = this.problem.starterCodePython || this.getDefaultStarterCode();

        console.log('Initializing Monaco editor (Python only):', {
            hasStarterCodePython: !!this.problem.starterCodePython,
            pythonCode,
            functionName: this.problem.functionName
        });

        // Create DOM element for Monaco editor - matrix style
        this.editorContainer = document.createElement('div');
        this.editorContainer.id = 'monaco-editor-container';
        this.editorContainer.style.position = 'absolute';
        this.editorContainer.style.border = '2px solid #00ff00';
        this.editorContainer.style.backgroundColor = '#000000';
        this.editorContainer.style.zIndex = '5'; // Lower than Phaser buttons (10001+)
        this.editorContainer.style.display = 'block';
        this.editorContainer.style.pointerEvents = 'none'; // Container non-interactive
        this.editorContainer.style.overflow = 'hidden'; // Critical: prevent overflow
        this.editorContainer.style.boxSizing = 'border-box';

        document.body.appendChild(this.editorContainer);

        // Initialize Monaco editor with Python
        const model = monaco.editor.createModel(
            pythonCode,
            'python'
        );

        // Create custom matrix theme
        monaco.editor.defineTheme('firewall-matrix', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', foreground: '00ff00', background: '000000' },
                { token: 'comment', foreground: '00ff00', fontStyle: 'italic' },
                { token: 'keyword', foreground: '00ff00', fontStyle: 'bold' },
                { token: 'string', foreground: '00ff00' },
                { token: 'number', foreground: '00ff00' }
            ],
            colors: {
                'editor.background': '#000000',
                'editor.foreground': '#00ff00',
                'editor.lineHighlightBackground': '#001a00',
                'editor.selectionBackground': '#003300',
                'editorCursor.foreground': '#00ff00',
                'editorWhitespace.foreground': '#003300',
                'editorIndentGuide.activeBackground': '#00ff00',
                'editorIndentGuide.background': '#003300'
            }
        });

        this.editor = monaco.editor.create(this.editorContainer, {
            model: model,
            theme: 'firewall-matrix',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            renderWhitespace: 'selection',
            fontFamily: 'Courier New, monospace'
        });

        // Enable pointer events on the Monaco editor itself so it's interactive
        // Use a small delay to ensure Monaco has fully initialized
        setTimeout(() => {
            const monacoDOM = this.editorContainer.querySelector('.monaco-editor');
            if (monacoDOM) {
                (monacoDOM as HTMLElement).style.pointerEvents = 'auto';
                (monacoDOM as HTMLElement).style.overflow = 'hidden';
                (monacoDOM as HTMLElement).style.boxSizing = 'border-box';
            }

            // Also enable pointer events on scrollbars and other interactive elements
            const scrollbars = this.editorContainer.querySelectorAll('.monaco-scrollable-element');
            scrollbars.forEach((el) => {
                (el as HTMLElement).style.pointerEvents = 'auto';
            });

            // Enable pointer events on the view lines (where you actually type)
            const viewLines = this.editorContainer.querySelector('.view-lines');
            if (viewLines) {
                (viewLines as HTMLElement).style.pointerEvents = 'auto';
            }
        }, 100);

        // Disable validation to prevent worker issues
        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true
        });

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: true
        });

        // Stop Phaser from capturing keyboard input when typing in Monaco
        this.editorContainer.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        this.editorContainer.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });
        
        // Prevent Monaco editor from blocking clicks outside its bounds
        // Add a click handler to the document that checks if click is on a button
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            // If click is on Monaco editor or its children, don't interfere
            if (this.editorContainer && this.editorContainer.contains(target)) {
                return;
            }
            // Otherwise, let Phaser handle it (buttons are Phaser objects)
        }, true);

        // Position the editor correctly initially
        this.updateMonacoPosition();

        console.log('Monaco editor initialized');
    }

    private updateMonacoPosition() {
        if (!this.editorContainer) return;

        // Get the Phaser canvas element
        const canvas = this.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        // Calculate panel dimensions in game coordinates
        const centerY = this.scale.height / 2;
        const panelWidth = this.scale.width - 80;
        const panelHeight = this.scale.height - 80;
        const columnWidth = panelWidth / 2 - 50;

        // Calculate Monaco editor position in game coordinates
        // Right column starts at center
        const gameLeftOffset = this.scale.width / 2 + 45;

        // Top offset - leave space for title and language selector
        // ADJUST THIS NUMBER to move Monaco editor up/down (higher = lower on screen)
        const gameTopOffset = (this.scale.height - panelHeight) / 2 + 220;

        // Calculate where control buttons are in game coordinates
        const buttonsY = centerY + panelHeight / 2 - 60;

        // Monaco should end well before the buttons (150px margin for safety)
        const monacoEndY = buttonsY - 150;
        const monacoHeight = Math.max(200, monacoEndY - gameTopOffset);

        // Get scale factors
        const scaleX = canvasRect.width / this.scale.width;
        const scaleY = canvasRect.height / this.scale.height;

        // Convert game coordinates to screen coordinates
        const screenLeft = canvasRect.left + (gameLeftOffset * scaleX);
        const screenTop = canvasRect.top + (gameTopOffset * scaleY);
        const screenWidth = (columnWidth - 40) * scaleX;
        const screenHeight = monacoHeight * scaleY;

        // Update Monaco editor position
        this.editorContainer.style.left = `${screenLeft}px`;
        this.editorContainer.style.top = `${screenTop}px`;
        this.editorContainer.style.width = `${screenWidth}px`;
        this.editorContainer.style.height = `${screenHeight}px`;

        // Ensure editor container doesn't extend beyond its bounds and block buttons
        this.editorContainer.style.overflow = 'hidden';
        this.editorContainer.style.maxHeight = `${screenHeight}px`;
        this.editorContainer.style.boxSizing = 'border-box';

        // Critical: container pointer events none, but Monaco inside is auto
        this.editorContainer.style.pointerEvents = 'none';

        console.log('Monaco editor bounds:', {
            left: screenLeft,
            top: screenTop,
            width: screenWidth,
            height: screenHeight,
            bottom: screenTop + screenHeight,
            buttonsStartY: canvasRect.top + (buttonsY * scaleY),
            clearance: (canvasRect.top + (buttonsY * scaleY)) - (screenTop + screenHeight)
        });
    }

    private handleResize() {
        this.updateMonacoPosition();
    }

    private getDefaultStarterCode(): string {
        // Convert camelCase to snake_case for Python
        const pythonFunctionName = this.problem.functionName.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `def ${pythonFunctionName}(${this.problem.parameters.join(', ')}):\n    # Write your solution here\n    pass\n`;
    }

    private createControlButtons(x: number, y: number) {
        // Run Tests button - green matrix style
        this.createButton(x - 200, y, '> RUN TESTS', 0x00ff00, () => this.runTests());

        // Submit button - bright green matrix style
        this.createButton(x, y, '> SUBMIT', 0x00ff00, () => this.submitSolution());

        // Skip button - red warning style
        this.createButton(x + 200, y, '> SKIP', 0xff0000, () => this.skipProblem());
    }

    private createButton(x: number, y: number, text: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
        const button = this.add.container(x, y);
        button.setDepth(10001); // Ensure buttons are above everything, including Monaco editor

        // Button background - black with colored border
        const bg = this.add.rectangle(0, 0, 160, 50, 0x000000);
        bg.setStrokeStyle(2, color);
        bg.setInteractive({ useHandCursor: true });
        bg.setDepth(10001);
        bg.setScrollFactor(0); // Don't scroll with camera
        button.add(bg);

        // Button label - matrix terminal style
        const label = this.add.text(0, 0, text, {
            fontSize: '13px',
            color: `#${color.toString(16).padStart(6, '0')}`,
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: `#${color.toString(16).padStart(6, '0')}`,
            strokeThickness: 0.5
        });
        label.setOrigin(0.5);
        label.setDepth(10001);
        label.setScrollFactor(0); // Don't scroll with camera
        button.add(label);

        // Click handler - prevent default browser behavior
        bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Prevent default browser actions (like print screen)
            if (pointer.event) {
                pointer.event.preventDefault();
                pointer.event.stopPropagation();
            }
            onClick();
        });

        // Hover effect - brighter glow
        bg.on('pointerover', () => {
            bg.setFillStyle(0x001a00);
            bg.setStrokeStyle(3, color);
            label.setStyle({ strokeThickness: 1 });
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x000000);
            bg.setStrokeStyle(2, color);
            label.setStyle({ strokeThickness: 0.5 });
        });

        return button;
    }

    private runTests() {
        console.log('=== RUN TESTS BUTTON CLICKED ===');
        const code = this.editor.getValue();
        console.log('Code from editor:', code);

        try {
            // Execute the user's code
            const userFunction = this.evaluateUserCode(code);

            // Run visible test cases
            const results = this.problem.testCases.map((testCase) => {
                try {
                    const startTime = performance.now();
                    // Handle input - spread array if it matches parameter count, otherwise wrap
                    let args: any[];
                    if (Array.isArray(testCase.input)) {
                        // If input array length matches parameter count, spread it as arguments
                        // Otherwise, pass the array as a single argument
                        if (testCase.input.length === this.problem.parameters.length) {
                            args = testCase.input;
                        } else {
                            args = [testCase.input];
                        }
                    } else {
                        args = [testCase.input];
                    }

                    const actual = userFunction(...args);
                    const executionTime = performance.now() - startTime;

                    const passed = JSON.stringify(actual) === JSON.stringify(testCase.expected);

                    return {
                        passed,
                        input: testCase.input,
                        expected: testCase.expected,
                        actual,
                        error: null,
                        executionTime
                    } as TestResult;
                } catch (error) {
                    return {
                        passed: false,
                        input: testCase.input,
                        expected: testCase.expected,
                        actual: null,
                        error: error instanceof Error ? error.message : String(error),
                        executionTime: 0
                    } as TestResult;
                }
            });

            // Display test results
            this.showTestResults(results);
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to compile code');
        }
    }

    private submitSolution() {
        console.log('=== SUBMIT BUTTON CLICKED ===');
        const code = this.editor.getValue();
        console.log('Submitting solution:', code);

        try {
            // Execute the user's code
            const userFunction = this.evaluateUserCode(code);

            // Run all test cases (including hidden ones)
            const allTests = [
                ...this.problem.testCases,
                ...(this.problem.hiddenTestCases || [])
            ];

            const results = allTests.map(testCase => {
                try {
                    const startTime = performance.now();
                    // Handle input - spread array if it matches parameter count, otherwise wrap
                    let args: any[];
                    if (Array.isArray(testCase.input)) {
                        // If input array length matches parameter count, spread it as arguments
                        // Otherwise, pass the array as a single argument
                        if (testCase.input.length === this.problem.parameters.length) {
                            args = testCase.input;
                        } else {
                            args = [testCase.input];
                        }
                    } else {
                        args = [testCase.input];
                    }

                    const actual = userFunction(...args);
                    const executionTime = performance.now() - startTime;

                    const passed = JSON.stringify(actual) === JSON.stringify(testCase.expected);

                    return {
                        passed,
                        input: testCase.input,
                        expected: testCase.expected,
                        actual,
                        error: null,
                        executionTime
                    } as TestResult;
                } catch (error) {
                    return {
                        passed: false,
                        input: testCase.input,
                        expected: testCase.expected,
                        actual: null,
                        error: error instanceof Error ? error.message : String(error),
                        executionTime: 0
                    } as TestResult;
                }
            });

            // Check if all tests passed
            const allPassed = results.every(r => r.passed);

            if (allPassed) {
                this.showSuccess();
                this.time.delayedCall(2000, () => {
                    this.closeChallenge();
                });
            } else {
                // Failed submission - increment counter
                this.failedAttempts++;
                const attemptsRemaining = this.MAX_ATTEMPTS - this.failedAttempts;

                console.log(`Failed attempt ${this.failedAttempts}/${this.MAX_ATTEMPTS}`);

                if (this.failedAttempts >= this.MAX_ATTEMPTS) {
                    // Game Over - 3 strikes
                    this.triggerGameOver();
                } else {
                    // Show test results with attempts remaining
                    this.showTestResults(results, true, attemptsRemaining);
                }
            }
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'Failed to compile code');
        }
    }

    private showSuccess() {
        // Hide Monaco editor so overlay appears on top
        if (this.editorContainer) {
            this.editorContainer.style.display = 'none';
        }

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const successOverlay = this.add.container(centerX, centerY);
        successOverlay.setDepth(10000);

        // Matrix-style success overlay
        const bg = this.add.rectangle(0, 0, 550, 280, 0x000000);
        bg.setStrokeStyle(3, 0x00ff00);
        bg.setAlpha(0.98);
        successOverlay.add(bg);

        const text = this.add.text(0, -60, '> SOLUTION ACCEPTED', {
            fontSize: '32px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 1
        });
        text.setOrigin(0.5);
        successOverlay.add(text);

        const stats = this.add.text(0, 20,
            `> Problem ${this.problem.number}/75 Complete\n` +
            `> Earned ${this.problem.reward} points`, {
            fontSize: '18px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            align: 'center',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        stats.setOrigin(0.5);
        successOverlay.add(stats);

        // Animation
        successOverlay.setScale(0);
        this.tweens.add({
            targets: successOverlay,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private skipProblem() {
        console.log('=== SKIP BUTTON CLICKED ===');
        const confirmSkip = confirm('Skip this problem?\n\nYou will receive a -100 point penalty.');

        if (confirmSkip) {
            console.log('Problem skipped with -100 points penalty');

            // Emit event to Game scene to deduct points
            const gameScene = this.scene.get('Game') as any;
            if (gameScene && gameScene.deductScore) {
                gameScene.deductScore(100);
            }

            this.closeChallenge();
        }
    }

    private evaluateUserCode(code: string): Function {
        // Python-only: transpile Python code to JavaScript
        try {
            return this.transpilePythonToJS(code);
        } catch (error) {
            throw new Error(`Compilation error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private transpilePythonToJS(pythonCode: string): Function {
        try {
            // Simple Python to JavaScript transpilation for basic LeetCode problems
            // This is a basic implementation - for production, use Brython or Pyodide

            // Extract function definition
            const functionMatch = pythonCode.match(/def\s+(\w+)\s*\((.*?)\):/);
            if (!functionMatch) {
                throw new Error('Could not find Python function definition');
            }

            const functionName = functionMatch[1];
            const params = functionMatch[2];

            // Extract function body (everything after the first line, indented)
            const lines = pythonCode.split('\n').slice(1);
            let body = '';

            // Find the minimum indentation level (to handle any indentation style)
            // Filter out empty lines, comments, and docstrings when calculating min indent
            let skipDocstringForIndent = false;
            const nonEmptyLines = lines.filter(line => {
                const trimmed = line.trim();
                if (trimmed === '' || trimmed.startsWith('#')) return false;

                // Skip docstrings
                if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
                    const delimiter = trimmed.substring(0, 3);
                    if (trimmed.endsWith(delimiter) && trimmed.length > 6) {
                        // Single-line docstring
                        return false;
                    }
                    skipDocstringForIndent = !skipDocstringForIndent;
                    return false;
                }
                if (skipDocstringForIndent) return false;

                return true;
            });

            const minIndent = nonEmptyLines.length > 0
                ? Math.min(...nonEmptyLines.map(line => {
                    const match = line.match(/^(\s*)/);
                    return match ? match[1].length : 0;
                }))
                : 0;

            // Track indentation levels to properly close blocks
            let lastIndentLevel = 0;
            const indentStack: number[] = [0];
            let inDocstring = false;
            let docstringDelimiter = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();

                // Skip empty lines and comments
                if (trimmed === '' || trimmed.startsWith('#')) continue;

                // If we're already in a docstring, check if this line ends it
                if (inDocstring) {
                    if (trimmed === docstringDelimiter || trimmed.endsWith(docstringDelimiter)) {
                        inDocstring = false;
                        docstringDelimiter = '';
                    }
                    continue;
                }

                // Handle docstrings (both """ and ''')
                if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
                    const delimiter = trimmed.substring(0, 3);

                    // Check if it's a single-line docstring
                    if (trimmed.length > 3 && trimmed.endsWith(delimiter) && trimmed.length > 6) {
                        // Single-line docstring, skip it
                        continue;
                    } else {
                        // Multi-line docstring starts
                        inDocstring = true;
                        docstringDelimiter = delimiter;
                        continue;
                    }
                }

                // Skip pass statements
                if (trimmed === 'pass') continue;

                // Calculate current indentation level
                const currentIndent = line.match(/^(\s*)/)?.[1].length || 0;
                const dedented = line.substring(minIndent);
                const relativeIndent = currentIndent - minIndent;

                // Close blocks when indentation decreases
                while (indentStack.length > 1 && relativeIndent < indentStack[indentStack.length - 1]) {
                    indentStack.pop();
                    body += '    '.repeat(indentStack.length) + '}\n';
                }

                // Basic Python to JS conversions
                let jsLine = dedented
                    .replace(/\bTrue\b/g, 'true')
                    .replace(/\bFalse\b/g, 'false')
                    .replace(/\bNone\b/g, 'null')
                    .replace(/\band\b/g, '&&')
                    .replace(/\bor\b/g, '||')
                    .replace(/\bnot\b/g, '!')
                    .replace(/\bdef\b/g, 'function')
                    .replace(/\bself\./g, 'this.');

                // Handle Python set() → new Set()
                jsLine = jsLine.replace(/\bset\(\)/g, 'new Set()');

                // Handle Python "x in set/list" → set.has(x) or list.includes(x)
                // Pattern: "variable in collection"
                const inCheckMatch = jsLine.match(/(\w+)\s+in\s+(\w+)/);
                if (inCheckMatch && !jsLine.includes('for')) {
                    const [fullMatch, item, collection] = inCheckMatch;
                    // Assume it's a Set for LeetCode problems (more common for membership checks)
                    jsLine = jsLine.replace(fullMatch, `${collection}.has(${item})`);
                }

                // Handle for loops: "for x in y:" → "for (const x of y) {"
                const forLoopMatch = jsLine.match(/for\s+(\w+)\s+in\s+(.+?):\s*$/);
                if (forLoopMatch) {
                    const [, loopVar, collection] = forLoopMatch;
                    jsLine = `for (const ${loopVar} of ${collection}) {`;
                    indentStack.push(relativeIndent + 4);
                }
                // Handle if statements: "if condition:" → "if (condition) {"
                else if (jsLine.trim().match(/^if\s+.+:\s*$/)) {
                    jsLine = jsLine.replace(/if\s+(.+?):\s*$/, 'if ($1) {');
                    indentStack.push(relativeIndent + 4);
                }
                // Handle elif → else if
                else if (jsLine.trim().match(/^elif\s+.+:\s*$/)) {
                    jsLine = jsLine.replace(/elif\s+(.+?):\s*$/, '} else if ($1) {');
                    // Don't push to stack, already in if block
                }
                // Handle else: → else {
                else if (jsLine.trim().match(/^else:\s*$/)) {
                    jsLine = jsLine.replace(/else:\s*$/, '} else {');
                    // Don't push to stack, already in if block
                }
                // Handle while loops: "while condition:" → "while (condition) {"
                else if (jsLine.trim().match(/^while\s+.+:\s*$/)) {
                    jsLine = jsLine.replace(/while\s+(.+?):\s*$/, 'while ($1) {');
                    indentStack.push(relativeIndent + 4);
                }

                // Handle Python ternary: "a if condition else b" → "condition ? a : b"
                const hasReturn = jsLine.trim().startsWith('return');
                const lineWithoutReturn = hasReturn ? jsLine.trim().substring(6).trim() : jsLine.trim();

                // Match: value1 if condition else value2
                const ternaryMatch = lineWithoutReturn.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
                if (ternaryMatch) {
                    const [, valueIfTrue, condition, valueIfFalse] = ternaryMatch;
                    const ternaryExpr = `(${condition}) ? (${valueIfTrue}) : (${valueIfFalse})`;
                    jsLine = hasReturn ? `return ${ternaryExpr}` : ternaryExpr;
                }

                // Handle built-in functions
                jsLine = jsLine.replace(/\bmax\(/g, 'Math.max(');
                jsLine = jsLine.replace(/\bmin\(/g, 'Math.min(');
                jsLine = jsLine.replace(/\babs\(/g, 'Math.abs(');
                jsLine = jsLine.replace(/\bround\(/g, 'Math.round(');

                // Handle len() → .length
                if (jsLine.includes('len(')) {
                    jsLine = jsLine.replace(/len\(([^)]+)\)/g, '$1.length');
                }

                // Handle .append() → .push()
                jsLine = jsLine.replace(/\.append\(/g, '.push(');

                // Handle .remove() → .delete() for sets (note: lists use splice, but sets are more common in LeetCode)
                jsLine = jsLine.replace(/\.remove\(/g, '.delete(');

                body += jsLine + '\n';
                lastIndentLevel = relativeIndent;
            }

            // Close any remaining open blocks
            while (indentStack.length > 1) {
                indentStack.pop();
                body += '    '.repeat(indentStack.length) + '}\n';
            }

            // If body is empty, return undefined
            if (body.trim() === '') {
                body = 'return undefined;';
            }

            // Create JavaScript function
            const jsCode = `
                return function ${functionName}(${params}) {
                    ${body}
                };
            `;

            console.log('Python transpilation:', {
                originalPython: pythonCode,
                functionName,
                params,
                body,
                generatedJS: jsCode
            });

            const fn = new Function(jsCode);
            return fn();
        } catch (error) {
            throw new Error(`Python transpilation error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private showTestResults(results: TestResult[], isSubmission: boolean = false, attemptsRemaining?: number) {
        // Hide Monaco editor so overlay appears on top
        if (this.editorContainer) {
            this.editorContainer.style.display = 'none';
        }

        // Create a results overlay
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const resultsOverlay = this.add.container(centerX, centerY);
        resultsOverlay.setDepth(10000);

        const passedCount = results.filter(r => r.passed).length;
        const totalCount = results.length;
        const allPassed = passedCount === totalCount;

        // Background - matrix style
        const bgColor = 0x000000;
        const borderColor = allPassed ? 0x00ff00 : 0xff0000;
        const bg = this.add.rectangle(0, 0, 650, 450, bgColor);
        bg.setStrokeStyle(3, borderColor);
        bg.setAlpha(0.98);
        resultsOverlay.add(bg);

        // Title - matrix terminal style
        const title = this.add.text(0, -180,
            isSubmission
                ? (allPassed ? '> ALL TESTS PASSED' : '> SOME TESTS FAILED')
                : '> TEST RESULTS', {
            fontSize: '26px',
            color: `#${borderColor.toString(16).padStart(6, '0')}`,
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: `#${borderColor.toString(16).padStart(6, '0')}`,
            strokeThickness: 1
        });
        title.setOrigin(0.5);
        resultsOverlay.add(title);

        // Stats - matrix style
        const stats = this.add.text(0, -140,
            `> ${passedCount}/${totalCount} tests passed`, {
            fontSize: '16px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        stats.setOrigin(0.5);
        resultsOverlay.add(stats);

        // Show attempts remaining warning if submission failed
        if (isSubmission && attemptsRemaining !== undefined && attemptsRemaining > 0) {
            const warningText = this.add.text(0, -110,
                `⚠️ ATTEMPTS REMAINING: ${attemptsRemaining}/${this.MAX_ATTEMPTS}`, {
                fontSize: '18px',
                color: '#ff0000',
                fontFamily: 'Courier New, monospace',
                fontStyle: 'bold',
                stroke: '#ff0000',
                strokeThickness: 1
            });
            warningText.setOrigin(0.5);
            resultsOverlay.add(warningText);
        }

        // Show individual test results (first 5)
        let yOffset = -80;
        const maxDisplay = Math.min(5, results.length);

        for (let i = 0; i < maxDisplay; i++) {
            const result = results[i];
            const status = result.passed ? '[PASS]' : '[FAIL]';
            const statusColor = result.passed ? '#00ff00' : '#ff0000';

            const testText = this.add.text(-280, yOffset,
                `> ${status} Test ${i + 1}: ${JSON.stringify(result.input)}`, {
                fontSize: '13px',
                color: statusColor,
                fontFamily: 'Courier New, monospace',
                stroke: statusColor,
                strokeThickness: 0.3
            });
            testText.setOrigin(0, 0.5);
            resultsOverlay.add(testText);

            if (!result.passed) {
                const errorText = this.add.text(-280, yOffset + 20,
                    result.error
                        ? `  > Error: ${result.error}`
                        : `  > Expected: ${JSON.stringify(result.expected)}\n  > Got: ${JSON.stringify(result.actual)}`, {
                    fontSize: '11px',
                    color: '#ff0000',
                    fontFamily: 'Courier New, monospace',
                    wordWrap: { width: 550 },
                    stroke: '#ff0000',
                    strokeThickness: 0.2
                });
                errorText.setOrigin(0, 0);
                resultsOverlay.add(errorText);
                yOffset += 30;
            }

            yOffset += 30;
        }

        if (results.length > maxDisplay) {
            const moreText = this.add.text(0, yOffset,
                `> ... and ${results.length - maxDisplay} more tests`, {
                fontSize: '13px',
                color: '#00ff00',
                fontFamily: 'Courier New, monospace',
                stroke: '#00ff00',
                strokeThickness: 0.3
            });
            moreText.setOrigin(0.5);
            resultsOverlay.add(moreText);
        }

        // Close button - matrix style
        const closeBtnBg = this.add.rectangle(0, 180, 120, 40, 0x000000);
        closeBtnBg.setStrokeStyle(2, 0x00ff00);
        closeBtnBg.setInteractive({ useHandCursor: true });
        resultsOverlay.add(closeBtnBg);

        const closeBtn = this.add.text(0, 180, '> CLOSE', {
            fontSize: '14px',
            color: '#00ff00',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#00ff00',
            strokeThickness: 0.5
        });
        closeBtn.setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        
        closeBtnBg.on('pointerdown', () => {
            resultsOverlay.destroy();
            // Show Monaco editor again
            if (this.editorContainer) {
                this.editorContainer.style.display = 'block';
            }
        });
        closeBtn.on('pointerdown', () => {
            resultsOverlay.destroy();
            // Show Monaco editor again
            if (this.editorContainer) {
                this.editorContainer.style.display = 'block';
            }
        });
        
        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x001a00);
            closeBtnBg.setStrokeStyle(3, 0x00ff00);
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x000000);
            closeBtnBg.setStrokeStyle(2, 0x00ff00);
        });
        
        resultsOverlay.add(closeBtn);

        // Animation
        resultsOverlay.setScale(0);
        this.tweens.add({
            targets: resultsOverlay,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private showError(message: string) {
        // Hide Monaco editor so overlay appears on top
        if (this.editorContainer) {
            this.editorContainer.style.display = 'none';
        }

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        const errorOverlay = this.add.container(centerX, centerY);
        errorOverlay.setDepth(10000);

        // Matrix-style error overlay
        const bg = this.add.rectangle(0, 0, 550, 250, 0x000000);
        bg.setStrokeStyle(3, 0xff0000);
        bg.setAlpha(0.98);
        errorOverlay.add(bg);

        const title = this.add.text(0, -60, '> COMPILATION ERROR', {
            fontSize: '22px',
            color: '#ff0000',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#ff0000',
            strokeThickness: 1
        });
        title.setOrigin(0.5);
        errorOverlay.add(title);

        const errorText = this.add.text(0, 10, `> ${message}`, {
            fontSize: '13px',
            color: '#ff0000',
            fontFamily: 'Courier New, monospace',
            wordWrap: { width: 500 },
            align: 'center',
            stroke: '#ff0000',
            strokeThickness: 0.3
        });
        errorText.setOrigin(0.5);
        errorOverlay.add(errorText);

        // Close button - matrix style
        const closeBtnBg = this.add.rectangle(0, 90, 120, 40, 0x000000);
        closeBtnBg.setStrokeStyle(2, 0xff0000);
        closeBtnBg.setInteractive({ useHandCursor: true });
        errorOverlay.add(closeBtnBg);

        const closeBtn = this.add.text(0, 90, '> CLOSE', {
            fontSize: '14px',
            color: '#ff0000',
            fontFamily: 'Courier New, monospace',
            fontStyle: 'bold',
            stroke: '#ff0000',
            strokeThickness: 0.5
        });
        closeBtn.setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        
        const closeHandler = () => {
            errorOverlay.destroy();
            // Show Monaco editor again
            if (this.editorContainer) {
                this.editorContainer.style.display = 'block';
            }
        };
        
        closeBtnBg.on('pointerdown', closeHandler);
        closeBtn.on('pointerdown', closeHandler);
        
        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x1a0000);
            closeBtnBg.setStrokeStyle(3, 0xff0000);
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x000000);
            closeBtnBg.setStrokeStyle(2, 0xff0000);
        });
        
        errorOverlay.add(closeBtn);

        // Animation
        errorOverlay.setScale(0);
        this.tweens.add({
            targets: errorOverlay,
            scaleX: 1,
            scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    private triggerGameOver() {
        console.log('=== GAME OVER - 3 FAILED ATTEMPTS ===');

        // Immediately hide Monaco editor
        if (this.editorContainer) {
            this.editorContainer.style.display = 'none';
        }

        // Clean up Monaco editor
        if (this.editor) {
            this.editor.dispose();
        }
        if (this.editorContainer && this.editorContainer.parentNode) {
            this.editorContainer.parentNode.removeChild(this.editorContainer);
        }

        // Remove resize listener
        this.scale.off('resize', this.handleResize, this);

        // Stop the Game scene and start GameOver scene
        this.scene.stop('Game');
        this.scene.stop(); // Stop LeetCodeChallenge scene
        this.scene.start('GameOver');
    }

    private closeChallenge() {
        // Immediately hide Monaco editor
        if (this.editorContainer) {
            this.editorContainer.style.display = 'none';
        }

        // Remove resize listener
        this.scale.off('resize', this.handleResize, this);

        // Clean up Monaco editor
        if (this.editor) {
            this.editor.dispose();
        }
        if (this.editorContainer && this.editorContainer.parentNode) {
            this.editorContainer.parentNode.removeChild(this.editorContainer);
        }

        // Resume game scene
        this.scene.resume('Game');
        this.scene.stop();
    }

    private getDifficultyColor(difficulty: number): string {
        if (difficulty <= 3) return '#4CAF50'; // Easy - Green
        if (difficulty <= 6) return '#FFC107'; // Medium - Yellow
        if (difficulty <= 8) return '#FF9800'; // Hard - Orange
        return '#f44336'; // Very Hard - Red
    }
}
