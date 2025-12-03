// ===== GAME STATE =====
const gameState = {
    currentScreen: 'start',
    difficulty: 'easy',
    tutorialStep: 1,
    currentRoom: 1,
    completedRooms: [],
    codes: ['?', '?', '?', '?', '?'],
    correctCodes: ['C', '4', 'B', 'E', 'R'],
    hintsRemaining: 3,
    hintsUsed: 0,
    timeRemaining: 1800, // 30 minutes in seconds
    timerInterval: null,
    score: 0,
    startTime: null,
    puzzleStates: {
        room1: { passwords: {} },
        room2: { 
            emails: {
                1: { verdict: null, foundIssues: [] },
                2: { verdict: null, foundIssues: [] },
                3: { verdict: null, foundIssues: [] }
            }
        },
        room3: { matches: {}, selectedTool: null },
        room4: { currentScenario: 1, completedScenarios: [] }
    }
};

// Difficulty settings
const difficultySettings = {
    easy: { time: 1800, hints: 3 },
    medium: { time: 1200, hints: 2 },
    hard: { time: 600, hints: 1 }
};

// Hints for each room
const hints = {
    1: "Tugev parool sisaldab suuri ja väikseid tähti, numbreid ja erimärke. Pikkus on samuti oluline - vähemalt 12 märki on soovitatav.",
    2: "Vaata hoolikalt e-posti aadressi ja linke. Õngitsuskirjad kasutavad sageli vale domeeni ja survet kiireks tegutsemiseks.",
    3: "Mõtle, mida iga turvalisuse tööriist teeb. Tulemüür kaitseb võrku, VPN krüpteerib ühendust jne.",
    4: "Ära kunagi jaga oma parooli ega isikuandmeid telefoni või e-posti teel. Kontrolli alati helistaja identiteeti.",
    5: "Kasuta koode, mille said eelmistest tubadest. Vaata üles HUD-i koodi kuvamist."
};

// ===== DOM ELEMENTS =====
const screens = {
    start: document.getElementById('start-screen'),
    tutorial: document.getElementById('tutorial-screen'),
    game: document.getElementById('game-screen'),
    success: document.getElementById('success-screen'),
    gameover: document.getElementById('gameover-screen')
};

const modals = {
    hint: document.getElementById('hint-modal'),
    menu: document.getElementById('menu-modal')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    createParticles();
});

function initializeEventListeners() {
    // Start screen
    document.getElementById('start-btn').addEventListener('click', startTutorial);
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', selectDifficulty);
    });

    // Tutorial navigation
    document.getElementById('tutorial-prev').addEventListener('click', prevTutorialStep);
    document.getElementById('tutorial-next').addEventListener('click', nextTutorialStep);

    // Game HUD
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('menu-btn').addEventListener('click', () => openModal('menu'));

    // Menu modal
    document.getElementById('resume-btn').addEventListener('click', () => closeModal('menu'));
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('quit-btn').addEventListener('click', quitToStart);

    // Close modals
    document.querySelectorAll('.close-modal, .close-hint').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Room navigation
    document.querySelectorAll('.room-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('locked')) {
                navigateToRoom(parseInt(this.dataset.room));
            }
        });
    });

    // Room 1: Password sorting (drag and drop)
    initPasswordPuzzle();

    // Room 2: Phishing detection
    initPhishingPuzzle();

    // Room 3: Network matching
    initNetworkPuzzle();

    // Room 4: Social engineering
    initSocialPuzzle();

    // Room 5: Server unlock
    initServerPuzzle();

    // Check buttons
    document.getElementById('check-passwords').addEventListener('click', checkPasswordPuzzle);
    document.getElementById('check-phishing').addEventListener('click', checkPhishingPuzzle);
    document.getElementById('check-network').addEventListener('click', checkNetworkPuzzle);
    document.getElementById('unlock-server').addEventListener('click', unlockServer);

    // End screens
    document.getElementById('play-again-btn').addEventListener('click', restartGame);
    document.getElementById('retry-btn').addEventListener('click', restartGame);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    screens[screenName].classList.add('active');
    gameState.currentScreen = screenName;
}

// ===== START SCREEN =====
function selectDifficulty(e) {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');
    gameState.difficulty = e.currentTarget.dataset.difficulty;
}

function startTutorial() {
    showScreen('tutorial');
    gameState.tutorialStep = 1;
    updateTutorialStep();
}

// ===== TUTORIAL =====
function updateTutorialStep() {
    const steps = document.querySelectorAll('.tutorial-step');
    const dots = document.querySelectorAll('.progress-dots .dot');
    
    steps.forEach((step, index) => {
        step.classList.toggle('active', index + 1 === gameState.tutorialStep);
    });
    
    dots.forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index + 1 === gameState.tutorialStep) {
            dot.classList.add('active');
        } else if (index + 1 < gameState.tutorialStep) {
            dot.classList.add('completed');
        }
    });
    
    document.getElementById('tutorial-prev').disabled = gameState.tutorialStep === 1;
    
    const nextBtn = document.getElementById('tutorial-next');
    if (gameState.tutorialStep === 3) {
        nextBtn.querySelector('.btn-text').textContent = 'Alusta';
        nextBtn.querySelector('.btn-icon').textContent = '🚀';
    } else {
        nextBtn.querySelector('.btn-text').textContent = 'Edasi';
        nextBtn.querySelector('.btn-icon').textContent = '▶';
    }
}

function prevTutorialStep() {
    if (gameState.tutorialStep > 1) {
        gameState.tutorialStep--;
        updateTutorialStep();
    }
}

function nextTutorialStep() {
    if (gameState.tutorialStep < 3) {
        gameState.tutorialStep++;
        updateTutorialStep();
    } else {
        startGame();
    }
}

// ===== GAME START =====
function startGame() {
    // Reset game state
    const settings = difficultySettings[gameState.difficulty];
    gameState.timeRemaining = settings.time;
    gameState.hintsRemaining = settings.hints;
    gameState.hintsUsed = 0;
    gameState.currentRoom = 1;
    gameState.completedRooms = [];
    gameState.codes = ['?', '?', '?', '?', '?'];
    gameState.score = 0;
    gameState.startTime = Date.now();
    
    // Reset puzzle states
    gameState.puzzleStates = {
        room1: { passwords: {} },
        room2: { 
            emails: {
                1: { verdict: null, foundIssues: [] },
                2: { verdict: null, foundIssues: [] },
                3: { verdict: null, foundIssues: [] }
            }
        },
        room3: { matches: {}, selectedTool: null },
        room4: { currentScenario: 1, completedScenarios: [] }
    };
    
    // Update UI
    updateHUD();
    updateRoomNavigation();
    resetAllPuzzles();
    
    // Show game screen and start timer
    showScreen('game');
    navigateToRoom(1);
    startTimer();
}

// ===== TIMER =====
function startTimer() {
    updateTimerDisplay();
    gameState.timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();
        
        if (gameState.timeRemaining <= 0) {
            gameOver();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    
    document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
    
    const timerContainer = document.querySelector('.timer-container');
    timerContainer.classList.remove('warning', 'danger');
    
    if (gameState.timeRemaining <= 60) {
        timerContainer.classList.add('danger');
    } else if (gameState.timeRemaining <= 300) {
        timerContainer.classList.add('warning');
    }
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// ===== HUD UPDATES =====
function updateHUD() {
    // Update hints
    document.getElementById('hints-left').textContent = gameState.hintsRemaining;
    
    // Update progress
    const progress = (gameState.completedRooms.length / 5) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `${gameState.completedRooms.length}/5`;
    
    // Update code display
    gameState.codes.forEach((code, index) => {
        const codeBox = document.getElementById(`code-${index + 1}`);
        codeBox.textContent = code;
        codeBox.classList.toggle('revealed', code !== '?');
    });
}

function updateRoomNavigation() {
    document.querySelectorAll('.room-nav-btn').forEach(btn => {
        const roomNum = parseInt(btn.dataset.room);
        btn.classList.remove('active', 'completed', 'locked');
        btn.disabled = false;
        
        if (roomNum === gameState.currentRoom) {
            btn.classList.add('active');
        }
        
        if (gameState.completedRooms.includes(roomNum)) {
            btn.classList.add('completed');
            btn.querySelector('.room-status').textContent = '✓';
        } else if (roomNum > gameState.completedRooms.length + 1) {
            btn.classList.add('locked');
            btn.querySelector('.room-status').textContent = '🔒';
        } else {
            btn.querySelector('.room-status').textContent = '●';
        }
    });
}

// ===== ROOM NAVIGATION =====
function navigateToRoom(roomNum) {
    gameState.currentRoom = roomNum;
    
    document.querySelectorAll('.room').forEach(room => {
        room.classList.remove('active');
    });
    document.getElementById(`room-${roomNum}`).classList.add('active');
    
    updateRoomNavigation();
}

// ===== ROOM 1: PASSWORD PUZZLE =====
function initPasswordPuzzle() {
    const draggables = document.querySelectorAll('.password-item.draggable');
    const dropZones = document.querySelectorAll('.drop-zone');
    const passwordsPool = document.querySelector('.passwords-pool');
    
    draggables.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        
        // Touch support
        item.addEventListener('touchstart', handleTouchStart, { passive: false });
        item.addEventListener('touchmove', handleTouchMove, { passive: false });
        item.addEventListener('touchend', handleTouchEnd);
        
        // Click to select for mobile
        item.addEventListener('click', handlePasswordClick);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', handleDragOver);
        zone.addEventListener('dragleave', handleDragLeave);
        zone.addEventListener('drop', handleDrop);
        
        // Click to drop for mobile
        zone.addEventListener('click', handleZoneClick);
    });
    
    // Allow dropping back to pool
    passwordsPool.addEventListener('dragover', handleDragOver);
    passwordsPool.addEventListener('dragleave', handleDragLeave);
    passwordsPool.addEventListener('drop', handleDropToPool);
    passwordsPool.addEventListener('click', handlePoolClick);
}

let selectedPassword = null;
let draggedItem = null;

function handlePasswordClick(e) {
    e.stopPropagation();
    if (selectedPassword) {
        selectedPassword.classList.remove('selected');
    }
    if (selectedPassword === this) {
        selectedPassword = null;
    } else {
        this.classList.add('selected');
        selectedPassword = this;
    }
}

function handleZoneClick(e) {
    if (selectedPassword) {
        this.appendChild(selectedPassword);
        selectedPassword.classList.remove('selected');
        selectedPassword = null;
    }
}

function handlePoolClick(e) {
    if (e.target === this && selectedPassword) {
        this.appendChild(selectedPassword);
        selectedPassword.classList.remove('selected');
        selectedPassword = null;
    }
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.password);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItem = null;
    document.querySelectorAll('.drop-zone, .passwords-pool').forEach(zone => {
        zone.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (draggedItem) {
        this.appendChild(draggedItem);
    }
}

function handleDropToPool(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (draggedItem) {
        this.appendChild(draggedItem);
    }
}

// Touch handlers for mobile
let touchStartX, touchStartY;
let clonedElement = null;

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    draggedItem = this;
    this.classList.add('dragging');
}

function handleTouchMove(e) {
    if (!draggedItem) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    draggedItem.style.position = 'fixed';
    draggedItem.style.left = `${touch.clientX - 50}px`;
    draggedItem.style.top = `${touch.clientY - 20}px`;
    draggedItem.style.zIndex = '1000';
    
    // Highlight drop zone under finger
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.drop-zone, .passwords-pool').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    
    if (elementBelow) {
        const dropZone = elementBelow.closest('.drop-zone, .passwords-pool');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }
}

function handleTouchEnd(e) {
    if (!draggedItem) return;
    
    draggedItem.style.position = '';
    draggedItem.style.left = '';
    draggedItem.style.top = '';
    draggedItem.style.zIndex = '';
    draggedItem.classList.remove('dragging');
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (elementBelow) {
        const dropZone = elementBelow.closest('.drop-zone, .passwords-pool');
        if (dropZone) {
            dropZone.appendChild(draggedItem);
        }
    }
    
    document.querySelectorAll('.drop-zone, .passwords-pool').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    
    draggedItem = null;
}

function checkPasswordPuzzle() {
    const dropZones = document.querySelectorAll('.drop-zone');
    let allCorrect = true;
    let totalPasswords = 0;
    let correctPasswords = 0;
    
    dropZones.forEach(zone => {
        const strength = zone.dataset.strength;
        const passwords = zone.querySelectorAll('.password-item');
        
        passwords.forEach(password => {
            totalPasswords++;
            const isCorrect = password.dataset.correct === strength;
            password.classList.remove('correct', 'incorrect');
            password.classList.add(isCorrect ? 'correct' : 'incorrect');
            
            if (isCorrect) {
                correctPasswords++;
            } else {
                allCorrect = false;
            }
        });
    });
    
    // Check pool - any password still there is wrong
    const poolPasswords = document.querySelectorAll('.passwords-pool .password-item');
    if (poolPasswords.length > 0) {
        allCorrect = false;
        poolPasswords.forEach(p => p.classList.add('incorrect'));
    }
    
    if (allCorrect && totalPasswords === 9) {
        completeRoom(1, 'C');
        showToast('Suurepärane! Said koodi esimese osa: C', 'success');
    } else {
        showToast(`Mõned paroolid on vales kategoorias. Proovi uuesti!`, 'error');
    }
}

// ===== ROOM 2: PHISHING PUZZLE =====
function initPhishingPuzzle() {
    // Email tabs
    document.querySelectorAll('.email-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const emailNum = this.dataset.email;
            switchEmail(emailNum);
        });
    });
    
    // Clickable suspicious elements
    document.querySelectorAll('.clickable-element').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            handleSuspiciousClick(this);
        });
    });
    
    // Verdict buttons
    document.querySelectorAll('.verdict-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            handleVerdictClick(this);
        });
    });
}

function switchEmail(emailNum) {
    document.querySelectorAll('.email-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.email === emailNum);
    });
    
    document.querySelectorAll('.email').forEach(email => {
        email.classList.toggle('active', email.id === `email-${emailNum}`);
    });
}

function handleSuspiciousClick(element) {
    const email = element.closest('.email');
    const emailNum = email.id.replace('email-', '');
    const emailState = gameState.puzzleStates.room2.emails[emailNum];
    
    if (element.dataset.suspicious === 'true' && !element.classList.contains('found')) {
        element.classList.add('found');
        
        const reason = element.dataset.reason;
        emailState.foundIssues.push(reason);
        
        // Add tag to issues list
        const issuesList = email.querySelector('.issues-list');
        const tag = document.createElement('span');
        tag.className = 'issue-tag';
        tag.textContent = reason;
        issuesList.appendChild(tag);
        
        // Update count
        const countSpan = email.querySelector('.issues-count');
        countSpan.textContent = emailState.foundIssues.length;
        
        showToast(`Ohumärk leitud: ${reason}`, 'info');
    }
}

function handleVerdictClick(button) {
    const email = button.closest('.email');
    const emailNum = email.id.replace('email-', '');
    const verdict = button.dataset.verdict;
    
    // Deselect all verdict buttons in this email
    email.querySelectorAll('.verdict-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    button.classList.add('selected');
    gameState.puzzleStates.room2.emails[emailNum].verdict = verdict;
}

function checkPhishingPuzzle() {
    const correctVerdicts = {
        1: 'dangerous',
        2: 'safe',
        3: 'dangerous'
    };
    
    let allCorrect = true;
    
    for (let i = 1; i <= 3; i++) {
        const state = gameState.puzzleStates.room2.emails[i];
        
        if (!state.verdict) {
            showToast('Palun anna hinnang kõigile e-kirjadele!', 'error');
            return;
        }
        
        if (state.verdict !== correctVerdicts[i]) {
            allCorrect = false;
        }
        
        // Mark tab as completed or incorrect
        const tab = document.querySelector(`.email-tab[data-email="${i}"]`);
        tab.classList.toggle('completed', state.verdict === correctVerdicts[i]);
    }
    
    if (allCorrect) {
        completeRoom(2, '4');
        showToast('Tubli! Said koodi teise osa: 4', 'success');
    } else {
        showToast('Mõned hinnangud on valed. Vaata e-kirju uuesti!', 'error');
    }
}

// ===== ROOM 3: NETWORK PUZZLE =====
function initNetworkPuzzle() {
    const tools = document.querySelectorAll('.match-item.tool');
    const descriptions = document.querySelectorAll('.match-item.description');
    
    tools.forEach(tool => {
        tool.addEventListener('click', function() {
            handleToolClick(this);
        });
    });
    
    descriptions.forEach(desc => {
        desc.addEventListener('click', function() {
            handleDescriptionClick(this);
        });
    });
}

function handleToolClick(tool) {
    if (tool.classList.contains('matched')) return;
    
    // Deselect previous selection
    document.querySelectorAll('.match-item.tool').forEach(t => {
        t.classList.remove('selected');
    });
    
    tool.classList.add('selected');
    gameState.puzzleStates.room3.selectedTool = tool.dataset.match;
}

function handleDescriptionClick(desc) {
    if (desc.classList.contains('matched')) return;
    
    const selectedToolId = gameState.puzzleStates.room3.selectedTool;
    if (!selectedToolId) {
        showToast('Vali esmalt tööriist vasakult!', 'info');
        return;
    }
    
    const descId = desc.dataset.match;
    const selectedTool = document.querySelector(`.match-item.tool[data-match="${selectedToolId}"]`);
    
    if (selectedToolId === descId) {
        // Correct match
        selectedTool.classList.remove('selected');
        selectedTool.classList.add('matched');
        desc.classList.add('matched');
        
        gameState.puzzleStates.room3.matches[selectedToolId] = descId;
        gameState.puzzleStates.room3.selectedTool = null;
        
        showToast('Õige ühendus!', 'success');
        
        // Draw connection line
        drawConnectionLine(selectedTool, desc);
    } else {
        // Incorrect match
        selectedTool.classList.add('incorrect');
        desc.classList.add('incorrect');
        
        setTimeout(() => {
            selectedTool.classList.remove('selected', 'incorrect');
            desc.classList.remove('incorrect');
        }, 500);
        
        showToast('Vale ühendus. Proovi uuesti!', 'error');
    }
}

function drawConnectionLine(tool, desc) {
    const svg = document.querySelector('.connection-svg');
    const toolRect = tool.getBoundingClientRect();
    const descRect = desc.getBoundingClientRect();
    const containerRect = document.querySelector('.matching-game').getBoundingClientRect();
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', toolRect.right - containerRect.left);
    line.setAttribute('y1', toolRect.top + toolRect.height / 2 - containerRect.top);
    line.setAttribute('x2', descRect.left - containerRect.left);
    line.setAttribute('y2', descRect.top + descRect.height / 2 - containerRect.top);
    line.classList.add('connection-line');
    
    svg.appendChild(line);
}

function checkNetworkPuzzle() {
    const matches = gameState.puzzleStates.room3.matches;
    const requiredMatches = ['firewall', 'antivirus', 'vpn', '2fa', 'backup'];
    
    const allMatched = requiredMatches.every(id => matches[id]);
    
    if (allMatched) {
        completeRoom(3, 'B');
        showToast('Suurepärane! Said koodi kolmanda osa: B', 'success');
    } else {
        const remaining = requiredMatches.length - Object.keys(matches).length;
        showToast(`Ühenda kõik tööriistad! Veel ${remaining} paari vaja.`, 'error');
    }
}

// ===== ROOM 4: SOCIAL ENGINEERING =====
function initSocialPuzzle() {
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            handleChoiceClick(this);
        });
    });
}

function handleChoiceClick(button) {
    const scenario = button.closest('.scenario');
    const scenarioNum = parseInt(scenario.id.replace('scenario-', ''));
    
    if (gameState.puzzleStates.room4.completedScenarios.includes(scenarioNum)) {
        return;
    }
    
    const isCorrect = button.dataset.correct === 'true';
    
    // Disable all choices in this scenario
    scenario.querySelectorAll('.choice-btn').forEach(btn => {
        btn.classList.add('disabled');
        if (btn === button) {
            btn.classList.add('selected', isCorrect ? 'correct' : 'incorrect');
        }
    });
    
    // Show feedback
    const feedback = document.getElementById('scenario-feedback');
    feedback.className = 'scenario-feedback show ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = isCorrect 
        ? '✓ Õige! See on kõige turvalisem käitumisviis.'
        : '✗ Vale! Sinu andmed võivad olla ohus.';
    
    gameState.puzzleStates.room4.completedScenarios.push(scenarioNum);
    
    // Move to next scenario after delay
    setTimeout(() => {
        if (scenarioNum < 4) {
            gameState.puzzleStates.room4.currentScenario = scenarioNum + 1;
            showScenario(scenarioNum + 1);
        } else {
            checkSocialPuzzle();
        }
    }, 2000);
}

function showScenario(num) {
    document.getElementById('scenario-current').textContent = num;
    
    document.querySelectorAll('.scenario').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`scenario-${num}`).classList.add('active');
    
    document.getElementById('scenario-feedback').className = 'scenario-feedback';
}

function checkSocialPuzzle() {
    const completed = gameState.puzzleStates.room4.completedScenarios;
    
    if (completed.length === 4) {
        // Check if all were answered correctly
        let allCorrect = true;
        for (let i = 1; i <= 4; i++) {
            const scenario = document.getElementById(`scenario-${i}`);
            const selectedBtn = scenario.querySelector('.choice-btn.selected');
            if (!selectedBtn || selectedBtn.dataset.correct !== 'true') {
                allCorrect = false;
            }
        }
        
        if (allCorrect) {
            completeRoom(4, 'E');
            showToast('Suurepärane! Said koodi neljanda osa: E', 'success');
        } else {
            showToast('Mõned vastused olid valed, aga said toa siiski läbi!', 'info');
            completeRoom(4, 'E');
        }
    }
}

// ===== ROOM 5: SERVER PUZZLE =====
let activeSlot = null;

function initServerPuzzle() {
    // Code slots
    document.querySelectorAll('.code-slot').forEach(slot => {
        slot.addEventListener('click', function() {
            handleSlotClick(this);
        });
    });
    
    // Code options
    document.querySelectorAll('.code-option').forEach(option => {
        option.addEventListener('click', function() {
            handleCodeOptionClick(this);
        });
    });
}

function handleSlotClick(slot) {
    // Deselect previous
    document.querySelectorAll('.code-slot').forEach(s => {
        s.classList.remove('active');
    });
    
    slot.classList.add('active');
    activeSlot = slot;
    
    // If slot already has a value, free up the option
    if (slot.dataset.value) {
        const oldValue = slot.dataset.value;
        document.querySelectorAll('.code-option').forEach(opt => {
            if (opt.dataset.code === oldValue) {
                opt.classList.remove('used');
            }
        });
    }
}

function handleCodeOptionClick(option) {
    if (!activeSlot || option.classList.contains('used')) return;
    
    const code = option.dataset.code;
    
    // Free up previous option if any
    if (activeSlot.dataset.value) {
        document.querySelectorAll('.code-option').forEach(opt => {
            if (opt.dataset.code === activeSlot.dataset.value) {
                opt.classList.remove('used');
            }
        });
    }
    
    // Set new value
    activeSlot.dataset.value = code;
    activeSlot.querySelector('.slot-value').textContent = code;
    activeSlot.classList.add('filled');
    activeSlot.classList.remove('active');
    
    option.classList.add('used');
    
    // Move to next empty slot
    const slots = Array.from(document.querySelectorAll('.code-slot'));
    const currentIndex = slots.indexOf(activeSlot);
    
    for (let i = currentIndex + 1; i < slots.length; i++) {
        if (!slots[i].dataset.value) {
            handleSlotClick(slots[i]);
            return;
        }
    }
    
    activeSlot = null;
}

function unlockServer() {
    const slots = document.querySelectorAll('.code-slot');
    const enteredCode = Array.from(slots).map(s => s.dataset.value || '');
    
    if (enteredCode.includes('')) {
        showToast('Palun sisesta kõik 5 koodi!', 'error');
        return;
    }
    
    const isCorrect = enteredCode.every((code, index) => code === gameState.correctCodes[index]);
    
    if (isCorrect) {
        // Server unlocked!
        const serverUnit = document.querySelector('.server-unit');
        serverUnit.classList.remove('locked');
        serverUnit.classList.add('unlocked');
        
        // Change lights
        const lights = serverUnit.querySelectorAll('.light');
        lights.forEach(light => {
            light.classList.remove('red');
            light.classList.add('green');
        });
        
        // Change status
        serverUnit.querySelector('.server-status').textContent = '🔓 AVATUD';
        
        // Complete room
        completeRoom(5, 'R');
        
        setTimeout(() => {
            gameComplete();
        }, 2000);
    } else {
        showToast('Vale kood! Proovi uuesti.', 'error');
        
        // Clear slots
        slots.forEach(slot => {
            if (slot.dataset.value) {
                const oldValue = slot.dataset.value;
                document.querySelectorAll('.code-option').forEach(opt => {
                    if (opt.dataset.code === oldValue) {
                        opt.classList.remove('used');
                    }
                });
            }
            slot.dataset.value = '';
            slot.querySelector('.slot-value').textContent = '?';
            slot.classList.remove('filled', 'active');
        });
    }
}

// ===== ROOM COMPLETION =====
function completeRoom(roomNum, code) {
    if (!gameState.completedRooms.includes(roomNum)) {
        gameState.completedRooms.push(roomNum);
        gameState.codes[roomNum - 1] = code;
        gameState.score += 100 * (4 - gameState.difficulty === 'easy' ? 1 : gameState.difficulty === 'medium' ? 2 : 3);
        
        updateHUD();
        updateRoomNavigation();
        
        // Auto-navigate to next room after delay
        if (roomNum < 5) {
            setTimeout(() => {
                navigateToRoom(roomNum + 1);
            }, 1500);
        }
    }
}

// ===== GAME END =====
function gameComplete() {
    stopTimer();
    
    const elapsedTime = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    
    // Calculate final score
    const timeBonus = gameState.timeRemaining * 2;
    const hintPenalty = gameState.hintsUsed * 50;
    const finalScore = gameState.score + timeBonus - hintPenalty;
    
    // Update success screen
    document.getElementById('final-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('hints-used').textContent = gameState.hintsUsed;
    document.getElementById('final-score').textContent = Math.max(0, finalScore);
    
    showScreen('success');
}

function gameOver() {
    stopTimer();
    document.getElementById('completed-puzzles').textContent = gameState.completedRooms.length;
    showScreen('gameover');
}

// ===== HINTS =====
function showHint() {
    if (gameState.hintsRemaining <= 0) {
        showToast('Vihjeid pole enam!', 'error');
        return;
    }
    
    const hintText = hints[gameState.currentRoom];
    document.getElementById('hint-text').textContent = hintText;
    
    gameState.hintsRemaining--;
    gameState.hintsUsed++;
    updateHUD();
    
    openModal('hint');
}

// ===== MODALS =====
function openModal(modalName) {
    modals[modalName].classList.add('active');
}

function closeModal(modalName) {
    modals[modalName].classList.remove('active');
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toast = document.getElementById('feedback-toast');
    const icon = toast.querySelector('.toast-icon');
    const text = toast.querySelector('.toast-message');
    
    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ'
    };
    
    icon.textContent = icons[type];
    text.textContent = message;
    
    toast.className = `toast ${type}`;
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== RESET & RESTART =====
function resetAllPuzzles() {
    // Reset Room 1
    const passwordsPool = document.querySelector('.passwords-pool');
    document.querySelectorAll('.password-item').forEach(item => {
        item.classList.remove('correct', 'incorrect', 'selected');
        passwordsPool.appendChild(item);
    });
    
    // Reset Room 2
    document.querySelectorAll('.email').forEach(email => {
        email.querySelectorAll('.clickable-element').forEach(el => {
            el.classList.remove('found');
        });
        email.querySelectorAll('.verdict-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        email.querySelector('.issues-list').innerHTML = '';
        email.querySelector('.issues-count').textContent = '0';
    });
    document.querySelectorAll('.email-tab').forEach(tab => {
        tab.classList.remove('completed');
    });
    switchEmail('1');
    
    // Reset Room 3
    document.querySelectorAll('.match-item').forEach(item => {
        item.classList.remove('matched', 'selected', 'incorrect');
    });
    document.querySelector('.connection-svg').innerHTML = '';
    
    // Reset Room 4
    document.querySelectorAll('.scenario').forEach((s, i) => {
        s.classList.toggle('active', i === 0);
        s.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect', 'disabled');
        });
    });
    document.getElementById('scenario-current').textContent = '1';
    document.getElementById('scenario-feedback').className = 'scenario-feedback';
    
    // Reset Room 5
    document.querySelectorAll('.code-slot').forEach(slot => {
        slot.dataset.value = '';
        slot.querySelector('.slot-value').textContent = '?';
        slot.classList.remove('filled', 'active');
    });
    document.querySelectorAll('.code-option').forEach(opt => {
        opt.classList.remove('used');
    });
    const serverUnit = document.querySelector('.server-unit');
    serverUnit.classList.remove('unlocked');
    serverUnit.classList.add('locked');
    serverUnit.querySelectorAll('.light').forEach(l => {
        l.classList.remove('green');
        l.classList.add('red');
    });
    serverUnit.querySelector('.server-status').textContent = '🔒 LUKUSTATUD';
}

function restartGame() {
    closeModal('menu');
    stopTimer();
    
    // Reset to difficulty selection
    showScreen('start');
}

function quitToStart() {
    closeModal('menu');
    stopTimer();
    showScreen('start');
}

// ===== VISUAL EFFECTS =====
function createParticles() {
    const particleContainer = document.querySelector('.floating-particles');
    if (!particleContainer) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: ${Math.random() > 0.5 ? 'var(--primary-color)' : 'var(--accent-color)'};
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${Math.random() * 10 + 10}s infinite;
            animation-delay: ${Math.random() * 5}s;
            opacity: ${Math.random() * 0.5 + 0.3};
        `;
        particleContainer.appendChild(particle);
    }
}

// Make draggable items actually draggable
document.querySelectorAll('.draggable').forEach(item => {
    item.setAttribute('draggable', 'true');
});
