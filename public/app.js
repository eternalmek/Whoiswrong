// ==========================================
// Who Is Wrong? - Frontend Application
// ==========================================

// --- Configuration ---
// Use existing API_BASE from auth.js if available, otherwise define it
const APP_API_BASE = (typeof API_BASE !== 'undefined') ? API_BASE : window.location.origin;

// --- Auth State ---
let currentUser = null;
// Get token from localStorage and validate it's not a stringified null/undefined
const storedToken = localStorage.getItem('accessToken');
let accessToken = (storedToken && storedToken !== 'null' && storedToken !== 'undefined') ? storedToken : null;
// Use existing REFRESH_TOKEN_KEY from auth.js if available
const APP_REFRESH_TOKEN_KEY = (typeof REFRESH_TOKEN_KEY !== 'undefined') ? REFRESH_TOKEN_KEY : 'refreshToken';
const storedRefreshToken = localStorage.getItem(APP_REFRESH_TOKEN_KEY);
let refreshToken = (storedRefreshToken && storedRefreshToken !== 'null' && storedRefreshToken !== 'undefined') ? storedRefreshToken : null;
const voterFingerprintKey = 'voterFingerprint';
const voterFingerprint = (() => {
    const existing = localStorage.getItem(voterFingerprintKey);
    if (existing) return existing;
    const generated = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(voterFingerprintKey, generated);
    return generated;
})();

// --- DOM Elements ---
const inputSection = document.getElementById('inputSection');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const userMenu = document.getElementById('userMenu');
const authButtons = document.getElementById('authButtons');
const signupPrompt = document.getElementById('signupPrompt');
const LAST_JUDGEMENT_KEY = 'lastJudgement';

// --- Judge State ---
const JUDGE_SELECTED_KEY = 'selectedJudgeId';
const UNLOCKED_KEY = 'unlockedJudgeIds';
const ALL_ACCESS_KEY = 'hasAllJudgeAccess';

const baseAvatar = (name) =>
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'Judge')}&radius=50&backgroundColor=f8fafc`;

// Priority order for judges (most viral/TikTok-friendly first)
const JUDGE_PRIORITY = [
    'normal',
    'taylor-swift',
    'cristiano-ronaldo',
    'lionel-messi',
    'donald-trump',
    'elon-musk',
    'barack-obama',
    'mrbeast',
    'kim-kardashian',
    'andrew-tate',
    'gordon-ramsay',
    'beyonce',
    'rihanna',
    'snoop-dogg',
    'pewdiepie',
    'eminem',
    'morgan-freeman',
];

const FALLBACK_JUDGES = (Array.isArray(window.celebrityJudges) && window.celebrityJudges.length)
    ? window.celebrityJudges
    : [{ id: 'normal', name: 'Default AI Judge', emoji: '🤖', description: 'Decisive and balanced.', category: 'Default', systemPrompt: '' }];

function normalizeJudge(judge) {
    return {
        ...judge,
        emoji: judge.emoji || '⭐',
        systemPrompt: judge.personality_prompt || judge.system_prompt || judge.systemPrompt,
        avatar_url: judge.photo_url || judge.avatar_url || judge.avatar_placeholder || baseAvatar(judge.name),
        id: judge.id || judge.slug,
    };
}

function getAvatarUrl(judge) {
    return (judge && (judge.avatar_url || judge.photo_url || judge.avatar_placeholder)) || baseAvatar(judge?.name || 'Judge');
}

function sortJudges(list) {
    return [...list].sort((a, b) => {
        const aIndex = JUDGE_PRIORITY.indexOf(a.id);
        const bIndex = JUDGE_PRIORITY.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return (a.name || '').localeCompare(b.name || '');
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });
}

let availableJudges = sortJudges(FALLBACK_JUDGES.map(normalizeJudge));

function safeParseArray(value, fallback = []) {
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
        return fallback;
    }
}

async function loadJudgesFromApi() {
    try {
        const response = await fetch(`${APP_API_BASE}/api/judges`);
        const data = await response.json();

        if (data?.judges?.length) {
            availableJudges = sortJudges(data.judges.map(normalizeJudge));
            if (!availableJudges.find((j) => j.id === selectedJudgeId)) {
                selectedJudgeId = 'normal';
            }
            updateJudgeUI();
        }
    } catch (error) {
        console.warn('Falling back to local judges', error);
        availableJudges = sortJudges(FALLBACK_JUDGES.map(normalizeJudge));
        updateJudgeUI();
    }
}

// Number of judges that are free by default
const FREE_JUDGES_COUNT = 1;

// Server-synced purchases for logged-in users
let serverUnlockedJudges = [];
let serverHasAllAccess = false;

let lastSavedJudgementId = null;
let lastShareUrl = '';

function persistLastJudgement(data) {
    try {
        localStorage.setItem(LAST_JUDGEMENT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    } catch (error) {
        console.warn('Unable to persist last judgement', error);
    }
}

function loadPersistedJudgement() {
    try {
        const raw = localStorage.getItem(LAST_JUDGEMENT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.warn('Unable to load saved judgement', error);
        return null;
    }
}

let selectedJudgeId = localStorage.getItem(JUDGE_SELECTED_KEY) || 'normal';
if (!availableJudges.find((j) => j.id === selectedJudgeId)) {
    selectedJudgeId = 'normal';
}

let unlockedJudgeIds = safeParseArray(localStorage.getItem(UNLOCKED_KEY), []);
let hasAllAccess = localStorage.getItem(ALL_ACCESS_KEY) === 'true';

// --- Stripe Prices State ---
// Default/fallback prices (used until Stripe prices are fetched)
let stripePrices = {
    singleJudge: { formatted: '$0.99', amount: 0.99, currency: 'AUD' },
    allJudges: { formatted: '$3.99', amount: 3.99, currency: 'AUD', interval: 'month' }
};
let pricesLoaded = false;

// Loading messages for variety
const LOADING_MESSAGES = [
    "Reviewing the evidence...",
    "Consulting the AI council...",
    "Weighing both sides...",
    "Preparing the verdict...",
    "Analyzing arguments...",
    "Deliberating carefully...",
    "This one's interesting...",
    "Almost ready..."
];

const SAMPLE_DEBATES = [
    {
        title: 'Is pineapple on pizza a crime?',
        judge: 'Gordon Ramsay',
        judgeId: 'gordon-ramsay',
        summary: 'The chef says pineapple belongs in dessert, not on your pizza. Verdict: pineapple is wrong.'
    },
    {
        title: 'Messi vs Ronaldo',
        judge: 'Cristiano Ronaldo',
        judgeId: 'cristiano-ronaldo',
        summary: 'With GOAT energy, Ronaldo declares Messi wrong for ducking free kicks. Stadium erupts.'
    },
    {
        title: 'Is TikTok better than YouTube?',
        judge: 'MrBeast',
        judgeId: 'mrbeast',
        summary: 'MrBeast picks YouTube for depth, but dares you to prove him wrong with a viral TikTok.'
    },
    {
        title: 'Should you text back immediately?',
        judge: 'Taylor Swift',
        judgeId: 'taylor-swift',
        summary: 'Taylor says leaving them on read writes a better bridge. Verdict: texting back instantly is wrong.'
    },
];

// ==========================================
// State Management
// ==========================================

let loadingInterval = null;

function showLoading() {
    inputSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    // Cycle through loading messages
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) {
        let msgIndex = 0;
        loadingMsg.textContent = LOADING_MESSAGES[msgIndex];
        loadingInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
            loadingMsg.textContent = LOADING_MESSAGES[msgIndex];
        }, 2000);
    }
}

function hideLoading() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
}

function showResult(data) {
    hideLoading();
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('fade-in', 'pop-scale');

    document.getElementById('loserName').innerText = data.wrong || "Unknown";
    document.getElementById('winnerName').innerText = data.right || "The Other One";
    document.getElementById('explanationText').innerText = `"${data.reason}"`;

    const judge = availableJudges.find((j) => j.id === selectedJudgeId) || availableJudges[0];
    const judgeLabel = document.getElementById('resultJudgeLabel');
    if (judgeLabel) {
        judgeLabel.innerText = `${judge.emoji || '🤖'} Verdict by ${judge.name}`;
    }

    // Hide signup prompt if user is logged in
    if (signupPrompt) {
        signupPrompt.style.display = currentUser ? 'none' : 'block';
    }

    // Reset button state
    resetSubmitButton();

}

function showInput() {
    hideLoading();
    loadingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    inputSection.classList.add('fade-in');
    resetSubmitButton();
}

function showError(msg) {
    hideLoading();
    loadingSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    errorSection.classList.remove('hidden');
    document.getElementById('errorMessage').innerText = msg;
    resetSubmitButton();
}

async function loadDebateById(id) {
    if (!id) return;
    showLoading();
    try {
        const res = await fetch(`${APP_API_BASE}/api/judgements/${id}`);
        const data = await res.json();
        if (!res.ok || !data?.item) {
            throw new Error(data?.error || 'Debate not found');
        }

        const item = data.item;
        lastSavedJudgementId = item.id;
        lastShareUrl = `${window.location.origin}/debate/${item.id}`;

        if (item.judge_id) {
            selectedJudgeId = item.judge_id;
            persistJudgeState();
            updateJudgeUI();
        }

        if (document.getElementById('contextInput')) {
            document.getElementById('contextInput').value = item.context || '';
        }
        if (document.getElementById('optionA')) {
            document.getElementById('optionA').value = item.option_a || '';
        }
        if (document.getElementById('optionB')) {
            document.getElementById('optionB').value = item.option_b || '';
        }

        const judgementPayload = {
            wrong: item.wrong || item.option_b,
            right: item.right || item.option_a,
            reason: item.reason || 'No reason provided.',
            roast: item.roast || '',
        };

        persistLastJudgement({
            context: item.context,
            optionA: item.option_a,
            optionB: item.option_b,
            judgeId: selectedJudgeId,
            savedId: item.id,
            shareUrl: lastShareUrl,
            judgement: judgementPayload,
        });

        showResult(judgementPayload);
    } catch (error) {
        showInput();
        showToast(error.message || 'Unable to load debate', 'error');
    }
}

function hydrateFromSavedJudgement() {
    const saved = loadPersistedJudgement();
    if (!saved?.judgement) return false;

    if (saved.judgeId) {
        selectedJudgeId = saved.judgeId;
        persistJudgeState();
        updateJudgeUI();
    }

    if (document.getElementById('contextInput')) {
        document.getElementById('contextInput').value = saved.context || '';
    }
    if (document.getElementById('optionA')) {
        document.getElementById('optionA').value = saved.optionA || '';
    }
    if (document.getElementById('optionB')) {
        document.getElementById('optionB').value = saved.optionB || '';
    }

    lastSavedJudgementId = saved.savedId || null;
    lastShareUrl = saved.shareUrl || '';
    showResult(saved.judgement);
    return true;
}

function setSubmitButtonLoading(loading) {
    const btn = document.getElementById('judgeSubmitBtn');
    const icon = document.getElementById('judgeIcon');
    const text = document.getElementById('judgeBtnText');
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    
    if (!btn || !icon || !text) return;
    
    if (loading) {
        btn.disabled = true;
        btn.classList.remove('pulse-glow');
        icon.className = 'fas fa-spinner fa-spin';
        text.textContent = 'Judging...';
        if (optionA) optionA.disabled = true;
        if (optionB) optionB.disabled = true;
    } else {
        btn.disabled = false;
        btn.classList.add('pulse-glow');
        icon.className = 'fas fa-gavel';
        text.textContent = 'Judge Now';
        if (optionA) optionA.disabled = false;
        if (optionB) optionB.disabled = false;
    }
}

function resetSubmitButton() {
    setSubmitButtonLoading(false);
    updateSubmitButtonState();
}

function updateSubmitButtonState() {
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    const btn = document.getElementById('judgeSubmitBtn');
    
    if (!optionA || !optionB || !btn) return;
    
    const hasA = optionA.value.trim().length > 0;
    const hasB = optionB.value.trim().length > 0;
    
    if (!hasA || !hasB) {
        btn.disabled = true;
        btn.classList.remove('pulse-glow');
    } else {
        btn.disabled = false;
        btn.classList.add('pulse-glow');
    }
}

function resetApp() {
    document.getElementById('contextInput').value = '';
    document.getElementById('optionA').value = '';
    document.getElementById('optionB').value = '';
    showInput();
}

function persistJudgeState() {
    localStorage.setItem(JUDGE_SELECTED_KEY, selectedJudgeId);
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlockedJudgeIds));
    localStorage.setItem(ALL_ACCESS_KEY, hasAllAccess ? 'true' : 'false');
}

function getJudgeAccessInfo(judgeId) {
    const judge = availableJudges.find((j) => j.id === judgeId) || availableJudges[0];
    const judgeIndex = availableJudges.findIndex((j) => j.id === judgeId);
    const isFreeByDefault = judgeIndex >= 0 && judgeIndex < FREE_JUDGES_COUNT;
    
    // Check both local storage and server-synced purchases
    // Server takes precedence for logged-in users
    const localUnlocked = hasAllAccess || unlockedJudgeIds.includes(judge.id);
    const serverUnlocked = serverHasAllAccess || serverUnlockedJudges.includes(judge.id);
    const unlocked = isFreeByDefault || localUnlocked || serverUnlocked;

    let label = 'Free';
    if (isFreeByDefault) label = 'Free';
    else if (unlocked) label = '✓ Unlocked';
    else label = '$0.99';

    return { judge, unlocked, label };
}

function showPurchaseModal(judge) {
    const modal = document.getElementById('purchaseModal');
    const emoji = document.getElementById('purchaseJudgeEmoji');
    const name = document.getElementById('purchaseJudgeName');
    const desc = document.getElementById('purchaseJudgeDesc');
    
    if (!modal) return;
    
    if (emoji) emoji.textContent = judge.emoji || '🎭';
    if (name) name.textContent = judge.name;
    if (desc) desc.textContent = judge.description || 'Get unique verdicts with personality!';
    
    // Set the selected judge so unlock works correctly
    selectedJudgeId = judge.id;
    persistJudgeState();
    
    showModal('purchaseModal');
}

function ensureJudgeAccess() {
    const info = getJudgeAccessInfo(selectedJudgeId);
    if (info.unlocked) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'Unlock this judge or choose a free option.' };
}

function updateJudgeHint() {
    const hintEl = document.getElementById('judgeSelectionHint');
    const info = getJudgeAccessInfo(selectedJudgeId);
    if (hintEl) {
        hintEl.textContent = `${info.judge.emoji || '🤖'} ${info.judge.name}`;
    }
}

function renderJudgeChips() {
    const container = document.getElementById('judgeChips');
    if (!container) return;

    container.innerHTML = '';

    availableJudges.forEach((judge) => {
        const info = getJudgeAccessInfo(judge.id);
        const isSelected = judge.id === selectedJudgeId;
        const isLocked = !info.unlocked;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.role = 'option';
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.className = `judge-card text-left p-3 rounded-xl border-2 transition-all ${
            isSelected 
                ? 'border-red-500 bg-red-500/20 ring-2 ring-red-500/50' 
                : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
        } ${isLocked ? 'judge-locked' : ''}`;
        
        btn.addEventListener('click', () => {
            if (isLocked) {
                // Show purchase modal for locked judges
                showPurchaseModal(judge);
            } else {
                selectedJudgeId = judge.id;
                persistJudgeState();
                updateJudgeUI();
            }
        });

        // Lock icon for locked judges
        if (isLocked) {
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon text-gray-400';
            lockIcon.innerHTML = '<i class="fas fa-lock text-xs"></i>';
            btn.appendChild(lockIcon);
        }

        // Avatar and name
        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 mb-1';
        const avatar = document.createElement('div');
        avatar.className = 'w-9 h-9 rounded-full overflow-hidden bg-gray-800 flex-shrink-0';
        avatar.innerHTML = `<img src="${getAvatarUrl(judge)}" alt="${judge.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeJudge'" />`;
        const meta = document.createElement('div');
        meta.className = 'flex-1';
        meta.innerHTML = `<p class="font-semibold text-white text-sm leading-tight truncate">${judge.name}</p><p class="text-[11px] text-gray-400 truncate">${judge.description || 'Celebrity AI judge'}</p>`;
        header.appendChild(avatar);
        header.appendChild(meta);
        btn.appendChild(header);

        // Status badge
        const badge = document.createElement('span');
        badge.className = `inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-1 ${
            info.unlocked 
                ? 'bg-green-500/20 text-green-300' 
                : 'bg-gray-700 text-gray-400'
        }`;
        badge.textContent = info.label;
        btn.appendChild(badge);

        container.appendChild(btn);
    });
}

function updateUnlockButtons() {
    const unlockOneBtn = document.getElementById('unlockSelectedJudge');
    const unlockAllBtn = document.getElementById('unlockAllJudges');
    const info = getJudgeAccessInfo(selectedJudgeId);

    if (unlockOneBtn) {
        const shouldDisableSingle = info.unlocked;
        unlockOneBtn.disabled = shouldDisableSingle;
        unlockOneBtn.classList.toggle('opacity-50', shouldDisableSingle);
        const label = unlockOneBtn.querySelector('span');
        if (label) {
            label.innerText = info.unlocked ? 'Already unlocked' : 'Unlock this judge';
        }
    }

    if (unlockAllBtn) {
        const shouldDisableAll = hasAllAccess;
        unlockAllBtn.disabled = shouldDisableAll;
        unlockAllBtn.classList.toggle('opacity-50', shouldDisableAll);
    }
}

function updateJudgeUI() {
    renderJudgeChips();
    updateJudgeHint();
    updateUnlockButtons();
    updatePriceUI();
}

/**
 * Fetch current prices from Stripe API
 * 
 * This function fetches the actual prices configured in Stripe
 * and updates the global stripePrices state.
 * Prices are cached on the server for 5 minutes.
 */
async function fetchStripePrices() {
    try {
        const response = await fetch(`${APP_API_BASE}/api/prices`);

        if (!response.ok) {
            console.warn('Failed to fetch Stripe prices, using defaults');
            return;
        }

        const data = await response.json();

        if (data.singleJudge && data.allJudges) {
            stripePrices = data;
            pricesLoaded = true;
            
            // Update UI with new prices
            updateJudgeUI();
        }
    } catch (error) {
        console.warn('Error fetching Stripe prices:', error);
        // Keep using default prices
    }
}

/**
 * Format interval string for display
 * @param {string} interval - Stripe interval (e.g., 'month', 'year')
 * @returns {string} Formatted interval string (e.g., '/mo', '/yr')
 */
function formatInterval(interval) {
    if (interval === 'month') return '/mo';
    if (interval === 'year') return '/yr';
    return '';
}

/**
 * Update price displays in the UI with Stripe prices
 */
function updatePriceUI() {
    // Update unlock single button
    const unlockSelectedBtn = document.getElementById('unlockSelectedJudge');
    if (unlockSelectedBtn) {
        const priceSpan = unlockSelectedBtn.querySelector('span');
        if (priceSpan) {
            priceSpan.textContent = stripePrices.singleJudge.formatted;
        }
    }

    // Update unlock all button
    const unlockAllBtn = document.getElementById('unlockAllJudges');
    if (unlockAllBtn) {
        const priceSpan = unlockAllBtn.querySelector('span');
        if (priceSpan) {
            const interval = formatInterval(stripePrices.allJudges.interval);
            priceSpan.textContent = `All ${stripePrices.allJudges.formatted}${interval}`;
        }
    }

    // Update purchase modal buttons
    const purchaseSingleBtn = document.getElementById('purchaseSingleBtn');
    if (purchaseSingleBtn) {
        const span = purchaseSingleBtn.querySelector('span');
        if (span) {
            span.textContent = `Unlock This Judge – ${stripePrices.singleJudge.formatted}`;
        }
    }

    const purchaseAllBtn = document.getElementById('purchaseAllBtn');
    if (purchaseAllBtn) {
        const span = purchaseAllBtn.querySelector('span');
        if (span) {
            const interval = formatInterval(stripePrices.allJudges.interval);
            span.textContent = `Unlock ALL Judges – ${stripePrices.allJudges.formatted}${interval}`;
        }
    }
}

/**
 * Handle unlocking a single judge via Stripe checkout
 * 
 * @param {string} judgeId - The ID of the judge to unlock (must not be "normal")
 * 
 * This function:
 * 1. Validates the judgeId is not "normal" (free) and the judge is not already unlocked
 * 2. Calls /api/checkout with mode: "single" and the judgeId
 * 3. Redirects to the Stripe checkout session
 * 
 * The actual unlock happens on the success page after payment completion.
 */
async function handleUnlockSingle(judgeId) {
    // Validate judgeId
    if (!judgeId || judgeId === 'normal') {
        showToast('The Normal AI Judge is free!', 'info');
        return;
    }

    if (!accessToken || !currentUser) {
        showToast('Please log in to unlock judges.', 'info');
        showModal('loginModal');
        return;
    }

    const info = getJudgeAccessInfo(judgeId);
    if (info.unlocked) {
        showToast('This judge is already unlocked', 'info');
        return;
    }

    try {
        showToast('Redirecting to checkout...', 'info');

        const response = await fetch(`${APP_API_BASE}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
                mode: 'single',
                celebrityId: judgeId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create checkout session');
        }

        if (data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else {
            throw new Error('No checkout URL returned');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Failed to start checkout. Please try again.', 'error');
    }
}

/**
 * Handle unlocking all judges via Stripe subscription checkout
 * 
 * This function:
 * 1. Checks if user already has all access
 * 2. Calls /api/checkout with mode: "subscription"
 * 3. Redirects to the Stripe checkout session
 * 
 * The actual unlock happens on the success page after payment completion.
 */
async function handleUnlockAll() {
    if (hasAllAccess) {
        showToast('You already have access to all judges!', 'info');
        return;
    }

    if (!accessToken || !currentUser) {
        showToast('Please log in to unlock judges.', 'info');
        showModal('loginModal');
        return;
    }

    try {
        showToast('Redirecting to checkout...', 'info');

        const response = await fetch(`${APP_API_BASE}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
                mode: 'subscription',
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create checkout session');
        }

        if (data.url) {
            // Redirect to Stripe checkout
            window.location.href = data.url;
        } else {
            throw new Error('No checkout URL returned');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Failed to start checkout. Please try again.', 'error');
    }
}

// Legacy functions for backwards compatibility - now calls Stripe checkout
function unlockSelectedJudge() {
    handleUnlockSingle(selectedJudgeId);
}

function unlockAllJudges() {
    handleUnlockAll();
}

// ==========================================
// Authentication
// ==========================================

function updateAuthUI() {
    if (currentUser) {
        userMenu.classList.remove('hidden');
        userMenu.classList.add('flex');
        authButtons.classList.add('hidden');
        
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) {
            userEmailEl.innerText = currentUser.email || 'Account';
        }
    } else {
        userMenu.classList.add('hidden');
        userMenu.classList.remove('flex');
        authButtons.classList.remove('hidden');
    }
}

function persistSessionTokens({ access_token, refresh_token }) {
    if (access_token) {
        accessToken = access_token;
        localStorage.setItem('accessToken', accessToken);
    }

    if (refresh_token) {
        refreshToken = refresh_token;
        localStorage.setItem(APP_REFRESH_TOKEN_KEY, refreshToken);
    }
}

function clearSessionTokens() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    serverUnlockedJudges = [];
    serverHasAllAccess = false;
    localStorage.removeItem('accessToken');
    localStorage.removeItem(APP_REFRESH_TOKEN_KEY);
}

async function refreshSession() {
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${APP_API_BASE}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            clearSessionTokens();
            return false;
        }

        const data = await response.json();
        persistSessionTokens(data);
        if (data.user) currentUser = data.user;
        return true;
    } catch (error) {
        console.error('Session refresh failed:', error);
        clearSessionTokens();
        return false;
    }
}

/**
 * Fetch user's purchases from the server
 * Updates serverUnlockedJudges and serverHasAllAccess variables
 */
async function fetchUserPurchases() {
    if (!accessToken) {
        serverUnlockedJudges = [];
        serverHasAllAccess = false;
        return;
    }
    
    try {
        const response = await fetch(`${APP_API_BASE}/api/purchases`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            serverUnlockedJudges = data.unlockedJudges || [];
            serverHasAllAccess = data.hasAllAccess || false;
            
            // Sync server purchases to localStorage for offline access
            if (serverUnlockedJudges.length > 0 || serverHasAllAccess) {
                // Merge server unlocked judges with local
                const mergedUnlocked = [...new Set([...unlockedJudgeIds, ...serverUnlockedJudges])];
                unlockedJudgeIds = mergedUnlocked;
                localStorage.setItem(UNLOCKED_KEY, JSON.stringify(mergedUnlocked));
                
                if (serverHasAllAccess) {
                    hasAllAccess = true;
                    localStorage.setItem(ALL_ACCESS_KEY, 'true');
                }
            }
            
            // Update the UI to reflect server purchases
            updateJudgeUI();
        } else {
            console.warn('Failed to fetch purchases');
            serverUnlockedJudges = [];
            serverHasAllAccess = false;
        }
    } catch (error) {
        console.error('Fetch purchases failed:', error);
        serverUnlockedJudges = [];
        serverHasAllAccess = false;
    }
}

// Pending purchase expiry time (24 hours in milliseconds)
const PENDING_PURCHASE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Check if user just returned from a successful Stripe payment
 * The success page stores the session_id in localStorage
 */
async function handleStripeSuccessReturn() {
    const sessionId = localStorage.getItem('stripe_success_session_id');
    if (!sessionId) return;
    
    // Clear the session ID immediately to prevent duplicate processing
    localStorage.removeItem('stripe_success_session_id');
    
    console.log('Detected return from Stripe checkout, refreshing purchases...');
    
    // Refresh purchases from the server to get newly unlocked content
    await fetchUserPurchases();
    
    // Update the UI
    updateJudgeUI();
    
    // Show success message
    showToast('Payment successful! Your judges are now unlocked.', 'success');
}

/**
 * Save any pending purchases that were made before account creation
 */
async function savePendingPurchase() {
    const PENDING_PURCHASE_KEY = 'pendingPurchase';
    const pendingPurchaseStr = localStorage.getItem(PENDING_PURCHASE_KEY);
    
    if (!pendingPurchaseStr || !accessToken) return;
    
    try {
        const pendingPurchase = JSON.parse(pendingPurchaseStr);
        
        // Only save if purchase is recent (within 24 hours)
        const ageMs = Date.now() - (pendingPurchase.timestamp || 0);
        if (ageMs > PENDING_PURCHASE_EXPIRY_MS) {
            localStorage.removeItem(PENDING_PURCHASE_KEY);
            return;
        }
        
        const response = await fetch(`${APP_API_BASE}/api/purchases/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                purchaseType: pendingPurchase.purchaseType,
                judgeId: pendingPurchase.judgeId,
                stripeSessionId: pendingPurchase.stripeSessionId
            })
        });
        
        if (response.ok) {
            localStorage.removeItem(PENDING_PURCHASE_KEY);
            console.log('Pending purchase saved successfully');
        }
    } catch (error) {
        console.error('Failed to save pending purchase:', error);
    }
}

async function checkAuth(hasRefreshed = false) {
    if (!accessToken) {
        const refreshed = await refreshSession();
        if (!refreshed) {
            updateAuthUI();
            return;
        }
    }

    try {
        const response = await fetch(`${APP_API_BASE}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;

            // Save any pending purchases from before account creation
            await savePendingPurchase();

            // Check if user just returned from Stripe payment success
            await handleStripeSuccessReturn();

            // Fetch user's purchases from the server
            await fetchUserPurchases();
        } else if (response.status === 401 && !hasRefreshed) {
            const refreshed = await refreshSession();
            if (refreshed) {
                return checkAuth(true);
            }
            clearSessionTokens();
        } else {
            clearSessionTokens();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        clearSessionTokens();
    }

    updateAuthUI();
}

async function signup(email, password) {
    try {
        const response = await fetch(`${APP_API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }
        
        if (data.access_token) {
            persistSessionTokens(data);
            currentUser = data.user;

            // Save any pending purchases and fetch user purchases
            await savePendingPurchase();
            await fetchUserPurchases();

            updateAuthUI();
            hideModal('signupModal');
            showToast('Account created successfully!', 'success');
        } else {
            // Email confirmation required
            showToast('Please check your email to confirm your account', 'info');
            hideModal('signupModal');
        }
        
        return data;
    } catch (error) {
        throw error;
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${APP_API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        if (!data.access_token) {
            throw new Error('No access token received. Please try again.');
        }
        
        persistSessionTokens(data);
        currentUser = data.user;
        
        // Save any pending purchases and fetch user purchases
        await savePendingPurchase();
        await fetchUserPurchases();
        
        updateAuthUI();
        hideModal('loginModal');
        showToast('Welcome back!', 'success');
        
        return data;
    } catch (error) {
        throw error;
    }
}

function logout() {
    clearSessionTokens();
    updateAuthUI();
    updateJudgeUI(); // Refresh judge UI to show only local/free access
    showToast('Logged out successfully', 'info');
}

// ==========================================
// Core Judge Logic
// ==========================================

async function judgeNow(e) {
    if (e) e.preventDefault();

    const context = document.getElementById('contextInput').value.trim();
    const optionA = document.getElementById('optionA').value.trim();
    const optionB = document.getElementById('optionB').value.trim();

    if (!optionA || !optionB) {
        showToast("Enter both options to get a verdict!", 'error');
        return;
    }

    const accessCheck = ensureJudgeAccess();
    if (!accessCheck.allowed) {
        // Show purchase modal instead of just error
        const judge = availableJudges.find((j) => j.id === selectedJudgeId);
        if (judge) {
            showPurchaseModal(judge);
        } else {
            showToast(accessCheck.reason || 'Unlock this judge to continue.', 'error');
        }
        return;
    }

    setSubmitButtonLoading(true);
    showLoading();

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${APP_API_BASE}/api/judge`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ context, optionA, optionB, judgeId: selectedJudgeId })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.ok || !result.judgement) {
            throw new Error("Invalid response from AI Judge.");
        }

        lastSavedJudgementId = result.saved?.id || null;
        lastShareUrl = lastSavedJudgementId ? `${window.location.origin}/debate/${lastSavedJudgementId}` : '';
        persistLastJudgement({
            context,
            optionA,
            optionB,
            judgeId: selectedJudgeId,
            savedId: lastSavedJudgementId,
            shareUrl: lastShareUrl,
            judgement: result.judgement,
        });
        showResult(result.judgement);

    } catch (error) {
        console.error(error);
        showError(error.message || "The Judge is on a break. Please try again.");
    }
}

// ==========================================
// Utilities
// ==========================================

function copyResult() {
    const wrong = document.getElementById('loserName').innerText;
    const reason = document.getElementById('explanationText').innerText;
    const textToCopy = `Who is Wrong?\n❌ WRONG: ${wrong}\n🗣️ JUDGE SAYS: ${reason}\n\nJudge your battles at ${window.location.origin}`;
    
    // Use Clipboard API with fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopySuccess();
        }).catch(() => {
            fallbackCopy(textToCopy);
        });
    } else {
        fallbackCopy(textToCopy);
    }
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showCopySuccess();
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('Failed to copy', 'error');
    }
    document.body.removeChild(textArea);
}

function showCopySuccess() {
    const btn = document.querySelector('button[onclick="copyResult()"]');
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check"></i> Copied!`;
        setTimeout(() => btn.innerHTML = originalText, 2000);
    }
    showToast('Copied to clipboard!', 'success');
}

function getShareDetails() {
    const wrong = document.getElementById('loserName')?.innerText || 'someone';
    const reason = document.getElementById('explanationText')?.innerText || 'No reason given.';
    const link = lastShareUrl || (lastSavedJudgementId ? `${window.location.origin}/debate/${lastSavedJudgementId}` : window.location.origin);
    const text = `The AI Judge says ${wrong} is WRONG! 😂\n\n${reason}\n\nSettle your debates at:`;
    return { wrong, reason, link, text };
}

function shareOnTwitter() {
    const { text, link } = getShareDetails();
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(link);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
}

function shareDebate(platform) {
    const { text, link } = getShareDetails();
    const shareData = { title: 'Who Is Wrong? Verdict', text: text.replace(/\n/g, ' '), url: link };

    if (platform === 'x') {
        shareOnTwitter();
        return;
    }

    if (navigator.share) {
        navigator.share(shareData).catch(() => {
            // Ignore cancellation
        });
    } else {
        copyShareLink();
    }

    if (platform === 'tiktok') {
        copyShareLink('Link copied for TikTok');
        window.open('https://www.tiktok.com/upload?lang=en', '_blank');
    } else if (platform === 'instagram') {
        copyShareLink('Link copied for Instagram');
        window.open('https://www.instagram.com/create/story/', '_blank');
    }
}

function copyShareLink(customToastMessage) {
    const { link } = getShareDetails();
    const toastMessage = customToastMessage || 'Share link copied';
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(link).then(() => showToast(toastMessage, 'success'));
    } else {
        fallbackCopy(link);
        showToast(toastMessage, 'success');
    }
}

function getJudgeVisual(judgeId) {
    const judge = availableJudges.find((j) => j.id === judgeId) || availableJudges[0] || {};
    return {
        name: judge.name || 'AI Judge',
        avatar: getAvatarUrl(judge),
    };
}

function renderFeed(items = []) {
    const grid = document.getElementById('feedGrid');
    const empty = document.getElementById('feedEmpty');
    if (!grid) return;

    if (!items.length) {
        if (empty) empty.classList.remove('hidden');
        grid.innerHTML = '';
        renderSamples([]);
        return;
    }

    if (empty) empty.classList.add('hidden');
    grid.innerHTML = '';

    items.forEach((item) => {
        const judge = getJudgeVisual(item.judge_id || item.judge?.id || 'normal');
        const votes = item.votes || { agree: 0, disagree: 0 };
        const card = document.createElement('article');
        card.className = 'glass-panel p-4 rounded-xl border border-gray-800 hover:border-red-500 transition flex flex-col gap-3';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-3';
        const title = item.question_text || item.context || [item.option_a, item.option_b].filter(Boolean).join(' vs ');
        header.innerHTML = `<div class="w-10 h-10 rounded-full overflow-hidden bg-gray-800"><img src="${judge.avatar}" alt="${judge.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Judge'" /></div><div><p class="text-xs uppercase text-gray-500">${judge.name}</p><h4 class="text-lg font-display font-bold leading-snug">${title || 'Recent verdict'}</h4></div>`;
        card.appendChild(header);

        const summary = document.createElement('p');
        summary.className = 'text-sm text-gray-300';
        summary.textContent = item.verdict_text || item.reason || item.roast || 'See the verdict inside.';
        card.appendChild(summary);

        const verdict = document.createElement('div');
        verdict.className = 'text-sm text-gray-400 flex items-center gap-2 flex-wrap';
        const verdictLabel = item.verdict_text || (item.wrong ? `${item.wrong} was wrong` : 'Verdict ready');
        verdict.innerHTML = `<span class="px-2 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold">Verdict</span><span class="font-medium text-white">${verdictLabel}</span>`;
        card.appendChild(verdict);

        const votesRow = document.createElement('div');
        votesRow.className = 'flex items-center justify-between gap-2';
        votesRow.innerHTML = `
            <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="px-2 py-1 rounded-full bg-green-500/10 text-green-300">Agree: <strong>${votes.agree}</strong></span>
                <span class="px-2 py-1 rounded-full bg-red-500/10 text-red-300">Disagree: <strong>${votes.disagree}</strong></span>
            </div>
            <div class="flex items-center gap-2">
                <button class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg" data-vote="agree" data-id="${item.id}">Agree</button>
                <button class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg" data-vote="disagree" data-id="${item.id}">Disagree</button>
            </div>`;
        card.appendChild(votesRow);

        const shareRow = document.createElement('div');
        shareRow.className = 'flex items-center gap-2 text-xs text-gray-400';
        shareRow.innerHTML = `<button class="underline hover:text-white" data-copy-share="${item.id}">Copy link</button>`;
        card.appendChild(shareRow);

        grid.appendChild(card);
    });

    grid.querySelectorAll('button[data-vote]').forEach((btn) => {
        btn.addEventListener('click', () => voteOnDebate(btn.dataset.id, btn.dataset.vote));
    });

    grid.querySelectorAll('button[data-copy-share]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const link = `${window.location.origin}/debate/${btn.dataset.copyShare}`;
            navigator.clipboard?.writeText(link).then(() => showToast('Link copied', 'success'));
        });
    });
}

async function loadFeed(forceRefresh = false) {
    try {
        const res = await fetch(`${APP_API_BASE}/api/judgements/feed?limit=20${forceRefresh ? `&t=${Date.now()}` : ''}`);
        const data = await res.json();
        const items = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.judgements)
                ? data.judgements
                : [];
        renderFeed(items);
        renderSamples(items);
    } catch (error) {
        console.warn('Unable to load feed', error);
        renderFeed([]);
        renderSamples([]);
    }
}

async function voteOnDebate(id, vote) {
    try {
        const res = await fetch(`${APP_API_BASE}/api/judgements/${id}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({ vote, fingerprint: voterFingerprint }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Vote failed');
        showToast('Vote counted!', 'success');
        loadFeed(true);
    } catch (error) {
        showToast(error.message || 'Unable to vote', 'error');
    }
}

function renderSamples(items = []) {
    const grid = document.getElementById('sampleGrid');
    if (!grid) return;
    const source = items.length ? items.slice(0, 6).map((item) => ({
        title: item.question_text || item.context || `${item.option_a} vs ${item.option_b}`,
        judge: getJudgeVisual(item.judge_id || item.judge?.id || 'normal').name,
        judgeId: item.judge_id || item.judge?.id || 'normal',
        summary: item.verdict_text || item.reason || item.roast || 'Decisive verdict rendered.'
    })) : SAMPLE_DEBATES;

    grid.innerHTML = '';
    source.forEach((item) => {
        const judge = getJudgeVisual(item.judgeId);
        const card = document.createElement('div');
        card.className = 'glass-panel border border-gray-800 rounded-xl p-4 flex flex-col gap-2 hover:border-red-500 transition';
        card.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-full overflow-hidden bg-gray-800"><img src="${judge.avatar}" alt="${judge.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeJudge'" /></div>
                <div>
                    <p class="text-xs uppercase text-gray-500">${judge.name}</p>
                    <h4 class="text-white font-display text-lg leading-tight">${item.title}</h4>
                </div>
            </div>
            <p class="text-sm text-gray-300">${item.summary}</p>`;
        grid.appendChild(card);
    });
}

// ==========================================
// Modal Management
// ==========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear form errors
        const errorEl = modal.querySelector('[id$="Error"]');
        if (errorEl) {
            errorEl.classList.add('hidden');
            errorEl.innerText = '';
        }
    }
}

// ==========================================
// Toast Notifications
// ==========================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast) return;
    
    toastMessage.innerText = message;
    
    // Set icon based on type
    toastIcon.className = 'fas';
    switch (type) {
        case 'success':
            toastIcon.classList.add('fa-check-circle', 'text-green-400');
            break;
        case 'error':
            toastIcon.classList.add('fa-exclamation-circle', 'text-red-400');
            break;
        case 'info':
            toastIcon.classList.add('fa-info-circle', 'text-blue-400');
            break;
        default:
            toastIcon.classList.add('fa-check-circle', 'text-green-400');
    }
    
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function hydrateInitialView() {
    const params = new URLSearchParams(window.location.search);
    const debateId = params.get('debate');
    if (debateId) {
        loadDebateById(debateId);
        return;
    }

    hydrateFromSavedJudgement();
}

// ==========================================
// Event Listeners
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuth();

    // Fetch Stripe prices and update UI
    fetchStripePrices();

    // Render judge selection UI
    updateJudgeUI();
    loadJudgesFromApi();
    loadFeed();
    renderSamples([]);
    hydrateInitialView();

    const unlockSelectedJudgeBtn = document.getElementById('unlockSelectedJudge');
    if (unlockSelectedJudgeBtn) {
        unlockSelectedJudgeBtn.addEventListener('click', unlockSelectedJudge);
    }

    const unlockAllJudgesBtn = document.getElementById('unlockAllJudges');
    if (unlockAllJudgesBtn) {
        unlockAllJudgesBtn.addEventListener('click', unlockAllJudges);
    }

    // Judge form submission
    const judgeForm = document.getElementById('judgeForm');
    if (judgeForm) {
        judgeForm.addEventListener('submit', judgeNow);
    }
    
    // Add input listeners for button state
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    if (optionA) {
        optionA.addEventListener('input', updateSubmitButtonState);
    }
    if (optionB) {
        optionB.addEventListener('input', updateSubmitButtonState);
    }
    
    // Initial button state
    updateSubmitButtonState();
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            
            try {
                errorEl.classList.add('hidden');
                await login(email, password);
            } catch (error) {
                errorEl.innerText = error.message;
                errorEl.classList.remove('hidden');
            }
        });
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupPasswordConfirm').value;
            const errorEl = document.getElementById('signupError');
            
            if (password !== confirmPassword) {
                errorEl.innerText = 'Passwords do not match';
                errorEl.classList.remove('hidden');
                return;
            }
            
            try {
                errorEl.classList.add('hidden');
                await signup(email, password);
            } catch (error) {
                errorEl.innerText = error.message;
                errorEl.classList.remove('hidden');
            }
        });
    }
    
    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal('loginModal');
            hideModal('signupModal');
            hideModal('purchaseModal');
        }
    });
});

// Make functions available globally
window.showModal = showModal;
window.hideModal = hideModal;
window.logout = logout;
window.judgeNow = judgeNow;
window.resetApp = resetApp;
window.copyResult = copyResult;
window.shareOnTwitter = shareOnTwitter;
window.shareDebate = shareDebate;
window.copyShareLink = copyShareLink;
window.unlockSelectedJudge = unlockSelectedJudge;
window.unlockAllJudges = unlockAllJudges;
