# Firewall: Endless Runner Game - Video Presentation Script

## TITLE SLIDE (5-10 seconds)
- **Title:** Firewall: An Educational Endless Runner Game with Integrated Coding Challenges
- **Your Name:** [Your Name]
- **Class:** [Class Name and Number, e.g., "CSC 4821 - Game Development"]
- **Assignment:** Project Demonstration Video
- **Professor:** [Professor's Name]
- **Semester:** [Semester and Year, e.g., "Spring 2025"]
- **Due Date:** [Final Due Date]

---

## INTRODUCTION (30-45 seconds)

**Say your name and brief overview:**
- Firewall combines endless runner gameplay with real coding challenges
- Players control a hacker character dodging lasers and collecting diamonds
- Each diamond triggers a coding challenge (JavaScript or Python)
- Educational gaming: Learn algorithms while playing

**Visual:** Show gameplay footage

---

## DETAILED TECHNICAL INFORMATION (3-4 minutes)

### Technology Stack
- **Game Engine:** Phaser 3.90.0
- **Language:** TypeScript 5.7.2
- **Build Tool:** Vite 6.3.1
- **Frontend:** React 19.0.0
- **Code Editor:** Monaco Editor 0.54.0 (same as VS Code)
- **Physics:** Phaser Arcade Physics

### Architecture
- Scene-based system (Boot, Preloader, MainMenu, Game, LeetCodeChallenge, GameOver)
- Object-oriented design (separate classes for each game object)
- Event-driven communication (EventBus for React-Phaser)
- Modular structure (scenes, objects, systems, types, UI)

### Key Systems

**Player Mechanics:**
- Double jump system (-750px/s jump, -700px/s double jump)
- Slide with invincibility frames
- Collision box management (visual sprite vs physics body)
- Platform interaction (jump on, drop through with 0.75s hold)

**Laser System:**
- Warning phase: 1 second yellow outline
- Active phase: 1 second red laser beam
- Random spawning at diamond positions (30% chance every 1 second)
- Continuous collision detection (200ms cooldown per laser)
- Score penalty: halves score on hit

**Coding Challenges:**
- Monaco Editor integration
- JavaScript and Python support
- Live code execution with test validation
- Seamless pause/resume

**Score System:**
- Increases at 0.25x distance rate
- Laser hits halve current score
- Persistent tracking (deductions don't get overwritten)

### Technical Challenges Overcome
- Continuous collision detection with cooldown system
- State management across multiple scenes
- Sandboxed code execution with timeout protection
- Performance optimization (60 FPS target)

---

## BACKGROUND (1 minute)

**Inspiration:**
- Combines gaming passion with coding education
- Inspired by Jetpack Joyride (mechanics) and LeetCode (challenges)
- Goal: Make algorithm practice engaging, not like homework
- Theme: Cybersecurity/hacker aesthetic fits the concept

---

## WHAT YOU DID (3-4 minutes)

### Core Mechanics Implemented
- **Player:** Jump, double jump, slide, platform interaction
- **Lasers:** Warning → activation → collision system
- **Platforms:** Procedural generation with diamond spawning (30% chance)
- **Coding Challenges:** Full Monaco Editor integration

### Statistics & Measurements
- **Performance:** 60 FPS target, 600px/s scroll speed
- **Collision:** 200ms cooldown per laser
- **Spawn Rate:** 30% chance every 1 second
- **Code Files:** 15+ TypeScript files, ~2,500+ lines
- **Game Objects:** 6 main classes, 6 scenes

### Key Features
- ✅ Endless runner with auto-scrolling
- ✅ Double jump and slide mechanics
- ✅ Laser obstacle system with warning phases
- ✅ Soft platforms with diamond spawning
- ✅ Integrated coding challenges (JS & Python)
- ✅ Score system with penalties
- ✅ Pause menu system
- ✅ Matrix-themed UI
- ✅ Screen flash effects

**Visual:** Show gameplay demonstrations

---

## CONCLUSIONS (1-2 minutes)

### General
- Successfully combines entertainment and education
- Makes coding practice engaging and rewarding

### Technical Achievements
- Integrated Monaco Editor into Phaser game
- Complex collision detection with cooldowns
- Seamless pause/resume for coding challenges
- Modular, maintainable TypeScript codebase

### Educational Value
- Engaging algorithm practice
- Immediate feedback through test cases
- Multi-language support (JS & Python)
- Encourages repeated playthroughs

### Future Enhancements
- More coding problems
- Leaderboard system
- More laser patterns
- Difficulty progression
- Sound effects and music
- Achievements/unlockables

---

## CREDITS (30 seconds)
- [Professor's Name] for guidance
- [Classmates/Team Members] for testing
- Phaser.js community
- Monaco Editor team
- LeetCode for problem inspiration

---

## REFERENCES
1. Phaser 3 Documentation: https://newdocs.phaser.io
2. TypeScript Handbook: https://www.typescriptlang.org/docs/
3. Monaco Editor: https://microsoft.github.io/monaco-editor/
4. Vite Documentation: https://vitejs.dev/
5. Phaser React Template: https://github.com/phaserjs/template-react-ts

---

## DEMONSTRATION CHECKLIST
- [ ] Game startup and main menu
- [ ] Player movement (jump, double jump, slide)
- [ ] Laser warning → activation → collision
- [ ] Diamond collection → coding challenge
- [ ] Solving a coding problem
- [ ] Score changes (increases and penalties)
- [ ] Platform interaction
- [ ] Pause menu

---

## PRESENTATION TIPS
- **Timing:** Aim for 8-10 minutes total
- **Visuals:** Screen recordings, code snippets, diagrams
- **Demo:** Have game running for live demonstrations
- **Practice:** Rehearse transitions between sections
