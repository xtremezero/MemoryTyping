
// Constants
const SAMPLE_TEXT = "Memory is the faculty of the brain by which data or information is encoded, stored, and retrieved when needed. It is the retention of information over time for the purpose of influencing future action. If past events could not be remembered, it would be impossible for language, relationships, or personal identity to develop.";

// State
const state = {
    screen: 'setup', 
    text: '',
    difficulty: 'EASY',
    startTime: null,
    endTime: null,
    mistakes: 0,
    timerInterval: null,
    memorizeTime: 0
};

// DOM Elements
const screens = {
    setup: document.getElementById('screen-setup'),
    difficulty: document.getElementById('screen-difficulty'),
    memorize: document.getElementById('screen-memorize'),
    playing: document.getElementById('screen-playing'),
    results: document.getElementById('screen-results')
};

const elements = {
    setupText: document.getElementById('setup-text'),
    setupError: document.getElementById('setup-error'),
    btnSample: document.getElementById('btn-sample'),
    btnStart: document.getElementById('btn-start'),
    uploadFile: document.getElementById('file-input'),
    
    difficultyBtns: document.querySelectorAll('.difficulty-btn'),
    btnBackSetup: document.getElementById('btn-back-setup'),
    
    memorizeDisplay: document.getElementById('memorize-display'),
    memorizeTimer: document.getElementById('memorize-timer'),
    btnReady: document.getElementById('btn-ready'),
    
    progressBar: document.getElementById('progress-bar'),
    playingDifficultyBadge: document.getElementById('playing-difficulty-badge'),
    playingMistakes: document.getElementById('playing-mistakes'),
    playingHint: document.getElementById('playing-hint'),
    typingInput: document.getElementById('typing-input'),
    typingDisplay: document.getElementById('typing-display'),
    typingContainer: document.querySelector('.typing-container'),
    btnRestartGame: document.getElementById('btn-restart-game'),
    
    resultTime: document.getElementById('result-time'),
    resultMistakes: document.getElementById('result-mistakes'),
    resultWpm: document.getElementById('result-wpm'),
    resultAccuracy: document.getElementById('result-accuracy'),
    btnTryAgain: document.getElementById('btn-try-again'),
    btnNewGame: document.getElementById('btn-new-game')
};

// Utils
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Navigation
function switchScreen(screenName) {
    state.screen = screenName;
    
    // Hide all first
    Object.values(screens).forEach(el => {
        el.classList.remove('active');
        el.style.opacity = '0';
        el.style.display = 'none';
    });
    
    // Show new one with slight delay for animation effect (handled by CSS, but js ensures display block first)
    const target = screens[screenName];
    target.style.display = 'block';
    
    // Force reflow
    void target.offsetWidth;
    
    target.style.opacity = '1';
    target.classList.add('active');
}

elements.uploadFile.addEventListener('change', () => {
    const file = elements.uploadFile.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.setupText.value = e.target.result;
    };
    reader.readAsText(file);
})

// Setup Screen Logic
elements.btnSample.addEventListener('click', () => {
    elements.setupText.value = SAMPLE_TEXT;
    elements.setupError.classList.add('hidden');
    elements.setupText.focus();
    
    // Auto-expand textarea slightly if needed? CSS handles min-height.
});

elements.btnStart.addEventListener('click', () => {
    const text = elements.setupText.value.trim();
    if (text.length < 10) {
        elements.setupError.classList.remove('hidden');
        return;
    }
    // Normalize spaces: multiple spaces become one to simplify typing
    state.text = text.replace(/\s+/g, ' '); 
    switchScreen('difficulty');
});

elements.setupText.addEventListener('input', () => {
    elements.setupError.classList.add('hidden');
});

// Difficulty Screen Logic
elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.difficulty = btn.dataset.difficulty;
        initMemorize();
    });
});

elements.btnBackSetup.addEventListener('click', () => {
    switchScreen('setup');
});

// Memorize Screen Logic
function initMemorize() {
    state.memorizeTime = 0;
    elements.memorizeDisplay.textContent = state.text;
    
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    elements.memorizeTimer.textContent = "0:00";
    state.timerInterval = setInterval(() => {
        state.memorizeTime++;
        const mins = Math.floor(state.memorizeTime / 60);
        const secs = state.memorizeTime % 60;
        elements.memorizeTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
    
    switchScreen('memorize');
}

elements.btnReady.addEventListener('click', () => {
    clearInterval(state.timerInterval);
    initGame();
});

// Playing Logic
function initGame() {
    state.mistakes = 0;
    state.startTime = null;
    elements.typingInput.value = '';
    elements.typingDisplay.scrollTop = 0;
    elements.typingDisplay.dataset.prevLen = 0;
    elements.playingMistakes.textContent = '0';
    elements.progressBar.style.width = '0%';
    
    elements.typingInput.maxLength = state.text.length;
    
    // Badge Styling
    const diff = state.difficulty;
    elements.playingDifficultyBadge.textContent = diff;
    elements.playingDifficultyBadge.style.color = 
        diff === 'EASY' ? 'var(--accent-success)' : 
        diff === 'MEDIUM' ? 'var(--accent-warning)' : 'var(--accent-error)';
    elements.playingDifficultyBadge.style.borderColor = 
        diff === 'EASY' ? 'var(--accent-success)' : 
        diff === 'MEDIUM' ? 'var(--accent-warning)' : 'var(--accent-error)';

    const hintText = {
        'EASY': 'Hints enabled: Partial words are visible.',
        'MEDIUM': 'Harder: Only word starts are visible.',
        'HARD': 'Expert: Text is completely hidden.'
    };
    elements.playingHint.textContent = hintText[diff];
    
    renderTypingDisplay();
    switchScreen('playing');
    
    setTimeout(() => {
        elements.typingInput.focus();
    }, 200);
}

// Sync Scroll
elements.typingInput.addEventListener('scroll', () => {
    elements.typingDisplay.scrollTop = elements.typingInput.scrollTop;
});

// Anti-Cheat
elements.typingInput.addEventListener('paste', (e) => e.preventDefault());

// Focus trap for game container
elements.typingContainer.addEventListener('click', () => {
    elements.typingInput.focus();
});

elements.typingInput.addEventListener('input', handleTyping);
elements.btnRestartGame.addEventListener('click', initGame); 

function handleTyping(e) {
    const inputVal = elements.typingInput.value;
    
    // Start timer
    if (state.startTime === null && inputVal.length > 0) {
        state.startTime = Date.now();
    }
    
    // Mistake Logic
    const prevLen = parseInt(elements.typingDisplay.dataset.prevLen || 0);
    // Only check mistake if we added a character (not backspace)
    if (inputVal.length > prevLen) {
        const idx = inputVal.length - 1;
        if (inputVal[idx] !== state.text[idx]) {
            state.mistakes++;
            elements.playingMistakes.textContent = state.mistakes;
            
            // Visual Shake Feedback
            elements.typingContainer.classList.remove('shake');
            void elements.typingContainer.offsetWidth; 
            elements.typingContainer.classList.add('shake');
        }
    }
    elements.typingDisplay.dataset.prevLen = inputVal.length;

    // Progress Bar
    const progress = (inputVal.length / state.text.length) * 100;
    elements.progressBar.style.width = `${progress}%`;

    renderTypingDisplay();

    if (inputVal.length === state.text.length) {
        finishGame();
    }
}

function renderTypingDisplay() {
    const input = elements.typingInput.value;
    const target = state.text;
    let html = '';

    // Hint Logic
    // Easy: Show next 25 chars roughly (simplified) or word based.
    // Let's do word based visibility to make it look cleaner.
    
    // Calculate how much ahead we show
    let hintIndexLimit = input.length; 
    
    if (state.difficulty === 'EASY') {
        // Show next 15 chars always
        hintIndexLimit = input.length + 15;
    } else if (state.difficulty === 'MEDIUM') {
        // Show next 3 chars
        hintIndexLimit = input.length + 3;
    } else {
        // HARD: 0 hints
        hintIndexLimit = input.length; 
    }

    for (let i = 0; i < target.length; i++) {
        const char = target[i];
        const isTyped = i < input.length;
        const typedChar = input[i];
        
        let className = '';
        let content = char;

        if (isTyped) {
            // Typed characters
            if (typedChar === char) {
                className = 'char-correct';
            } else {
                className = 'char-wrong';
                content = typedChar; // Show what user typed (wrongly)
            }
        } else {
            // Untyped characters (Hints or Hidden)
            // Determine visibility
            const isVisible = i < hintIndexLimit;
            
            // Special rule for MEDIUM: Only show start of words if outside immediate range
            // But strict "next 3 chars" is simpler and cleaner for playability.
            
            if (isVisible) {
                className = 'char-hint';
            } else {
                className = 'char-hidden';
                // For layout preservation in char-hidden:
                // We keep content = char, but CSS color is transparent.
                // We add background/border in CSS to visually indicate a "block".
            }
        }
        
        // Cursor Logic: The cursor should be on the *current* character to be typed (index == input.length)
        if (i === input.length) {
            className += ' cursor-active';
        }

        // Handle line breaks visually
        if (char === '\n') {
            content = '<br>';
        } else {
            content = escapeHtml(content);
        }
        
        html += `<span class="${className}">${content}</span>`;
    }

    elements.typingDisplay.innerHTML = html;
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        obj.innerHTML = val;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end; 
        }
    };
    window.requestAnimationFrame(step);
}

function finishGame() {
    state.endTime = Date.now();
    let timeElapsed = (state.endTime - state.startTime) / 1000;
    if (timeElapsed < 1) timeElapsed = 1; 
    
    // Stats
    const wpm = Math.round((state.text.length / 5) / (timeElapsed / 60));
    const accuracy = Math.max(0, Math.round(((state.text.length - state.mistakes) / state.text.length) * 100));
    
    switchScreen('results');

    // Animations
    elements.resultTime.textContent = timeElapsed.toFixed(1) + 's';
    animateValue(elements.resultMistakes, 0, state.mistakes, 1000);
    animateValue(elements.resultWpm, 0, wpm, 1500);
    elements.resultAccuracy.textContent = accuracy + '%';
    
    if (accuracy === 100) {
        elements.resultAccuracy.style.color = 'var(--accent-success)';
    } else if (accuracy > 90) {
        elements.resultAccuracy.style.color = 'var(--primary)';
    } else {
        elements.resultAccuracy.style.color = 'var(--accent-warning)';
    }
}

// Results Interactions
elements.btnTryAgain.addEventListener('click', () => {
    initMemorize();
});

elements.btnNewGame.addEventListener('click', () => {
    elements.setupText.value = '';
    elements.typingDisplay.dataset.prevLen = 0;
    switchScreen('setup');
    setTimeout(() => elements.setupText.focus(), 100);
});

// Initial
switchScreen('setup');
