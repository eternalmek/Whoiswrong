// ==========================================
// Who Is Wrong? - Frontend Application
// ==========================================

// --- Configuration ---
const APP_API_BASE = (typeof API_BASE !== 'undefined') ? API_BASE : window.location.origin;

// --- Auth State ---
let currentUser = null;
const storedToken = localStorage.getItem('accessToken');
let accessToken = (storedToken && storedToken !== 'null' && storedToken !== 'undefined') ? storedToken : null;
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

const baseAvatar = (name) =>
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || 'Judge')}&radius=50&backgroundColor=f8fafc`;

const FALLBACK_JUDGES = (Array.isArray(window.celebrityJudges) && window.celebrityJudges.length)
    ? window.celebrityJudges
    : [{ id: 'normal', name: 'AI Judge', emoji: '🤖', description: 'Balanced, decisive, and straight to the point.', category: 'Core', systemPrompt: '' }];

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

let availableJudges = FALLBACK_JUDGES.map(normalizeJudge);

async function loadJudgesFromApi() {
    try {
        const response = await fetch(`${APP_API_BASE}/api/judges`);
        const data = await response.json();

        if (data?.judges?.length) {
            availableJudges = data.judges.map(normalizeJudge);
            if (!availableJudges.find((j) => j.id === selectedJudgeId)) {
                selectedJudgeId = 'normal';
            }
            updateJudgeUI();
        }
    } catch (error) {
        console.warn('Falling back to local judges', error);
        availableJudges = FALLBACK_JUDGES.map(normalizeJudge);
        updateJudgeUI();
    }
}

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

// Share text configuration
const SHARE_CONFIG = {
    twitter: "Who is wrong? Check this AI verdict on whoiswrong.io ⚖️👀",
    tiktok: "Link copied! Paste it in your TikTok description or comments.",
    instagram: "Link copied! Paste it in your Instagram story or post."
};

// Demo debates to show when database is empty
const SAMPLE_DEBATES = [
    {
        id: 'demo-pineapple',
        title: 'Is pineapple on pizza a crime?',
        judge: 'AI Judge',
        judgeId: 'normal',
        summary: 'The AI says pineapple belongs in dessert, not on your pizza. Verdict: pineapple is wrong.',
        isDemo: true
    },
    {
        id: 'demo-messi-ronaldo',
        title: 'Ronaldo vs Messi',
        judge: 'AI Judge',
        judgeId: 'normal',
        summary: 'With GOAT energy, the AI declares the debate settled. One is clearly wrong.',
        isDemo: true
    },
    {
        id: 'demo-tiktok',
        title: 'Is TikTok better than YouTube?',
        judge: 'AI Judge',
        judgeId: 'normal',
        summary: 'The AI picks YouTube for depth, but dares you to prove it wrong with a viral TikTok.',
        isDemo: true
    },
    {
        id: 'demo-text-back',
        title: 'Should you text back immediately?',
        judge: 'AI Judge',
        judgeId: 'normal',
        summary: 'The AI says leaving them on read writes a better story. Verdict: texting back instantly is wrong.',
        isDemo: true
    },
    {
        id: 'demo-cats-dogs',
        title: 'Cats or dogs?',
        judge: 'AI Judge',
        judgeId: 'normal',
        summary: 'The AI declares dogs are better because they can be trained to fetch. Cats are wrong.',
        isDemo: true
    }
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

    if (signupPrompt) {
        signupPrompt.style.display = currentUser ? 'none' : 'block';
    }

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
        text.textContent = 'Getting the Verdict...';
        if (optionA) optionA.disabled = true;
        if (optionB) optionB.disabled = true;
    } else {
        btn.disabled = false;
        btn.classList.add('pulse-glow');
        icon.className = 'fas fa-gavel';
        text.textContent = 'Get the Verdict';
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
}

function updateJudgeHint() {
    const hintEl = document.getElementById('judgeSelectionHint');
    const judge = availableJudges.find((j) => j.id === selectedJudgeId) || availableJudges[0];
    if (hintEl) {
        hintEl.textContent = `${judge.emoji || '🤖'} ${judge.name}`;
    }
}

function renderJudgeChips() {
    const container = document.getElementById('judgeChips');
    if (!container) return;

    container.innerHTML = '';

    availableJudges.forEach((judge) => {
        const isSelected = judge.id === selectedJudgeId;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.role = 'option';
        btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        btn.className = `judge-card text-left p-3 rounded-xl border-2 transition-all ${
            isSelected 
                ? 'border-red-500 bg-red-500/20 ring-2 ring-red-500/50' 
                : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
        }`;
        
        btn.addEventListener('click', () => {
            selectedJudgeId = judge.id;
            persistJudgeState();
            updateJudgeUI();
        });

        // Avatar and name
        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 mb-1';
        const avatar = document.createElement('div');
        avatar.className = 'w-9 h-9 rounded-full overflow-hidden bg-gray-800 flex-shrink-0';
        avatar.innerHTML = `<img src="${getAvatarUrl(judge)}" alt="${judge.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeJudge'" />`;
        const meta = document.createElement('div');
        meta.className = 'flex-1';
        meta.innerHTML = `<p class="font-semibold text-white text-sm leading-tight truncate">${judge.name}</p><p class="text-[11px] text-gray-400 truncate">${judge.description || 'AI judge'}</p>`;
        header.appendChild(avatar);
        header.appendChild(meta);
        btn.appendChild(header);

        // Status badge
        const badge = document.createElement('span');
        badge.className = 'inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mb-1 bg-green-500/20 text-green-300';
        badge.textContent = 'Free';
        btn.appendChild(badge);

        container.appendChild(btn);
    });
}

function updateJudgeUI() {
    renderJudgeChips();
    updateJudgeHint();
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
            updateAuthUI();
            hideModal('signupModal');
            showToast('Account created successfully!', 'success');
        } else {
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
    const { link } = getShareDetails();
    const encodedText = encodeURIComponent(SHARE_CONFIG.twitter);
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

    if (platform === 'tiktok') {
        copyShareLink(SHARE_CONFIG.tiktok);
        return;
    }
    
    if (platform === 'instagram') {
        copyShareLink(SHARE_CONFIG.instagram);
        return;
    }

    if (navigator.share) {
        navigator.share(shareData).catch(() => {
            copyShareLink();
        });
    } else {
        copyShareLink();
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

    const displayItems = items.length > 0 ? items : SAMPLE_DEBATES.map(demo => ({
        id: demo.id,
        question_text: demo.title,
        verdict_text: demo.summary,
        judge_id: demo.judgeId,
        isDemo: true,
        votes: { agree: Math.floor(Math.random() * 50) + 10, disagree: Math.floor(Math.random() * 20) + 5 }
    }));

    if (empty) empty.classList.add('hidden');
    grid.innerHTML = '';

    displayItems.forEach((item) => {
        const judge = getJudgeVisual(item.judge_id || item.judge?.id || 'normal');
        const votes = item.votes || { agree: 0, disagree: 0 };
        const isDemo = item.isDemo || false;
        const card = document.createElement('article');
        card.className = 'glass-panel p-4 rounded-xl border border-gray-800 hover:border-red-500 transition flex flex-col gap-3';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-3';
        const title = item.question_text || item.context || [item.option_a, item.option_b].filter(Boolean).join(' vs ');
        header.innerHTML = `<div class="w-10 h-10 rounded-full overflow-hidden bg-gray-800"><img src="${judge.avatar}" alt="${judge.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/adventurer/svg?seed=Judge'" /></div><div><p class="text-xs uppercase text-gray-500">${judge.name}${isDemo ? ' <span class="text-yellow-400">(Demo)</span>' : ''}</p><h4 class="text-lg font-display font-bold leading-snug">${title || 'Recent verdict'}</h4></div>`;
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
        
        if (isDemo) {
            votesRow.innerHTML = `
                <div class="flex items-center gap-2 text-xs text-gray-400">
                    <span class="px-2 py-1 rounded-full bg-green-500/10 text-green-300">Agree: <strong>${votes.agree}</strong></span>
                    <span class="px-2 py-1 rounded-full bg-red-500/10 text-red-300">Disagree: <strong>${votes.disagree}</strong></span>
                </div>
                <span class="text-xs text-gray-500 italic">Demo debate</span>`;
        } else {
            votesRow.innerHTML = `
                <div class="flex items-center gap-2 text-xs text-gray-400">
                    <span class="px-2 py-1 rounded-full bg-green-500/10 text-green-300">Agree: <strong>${votes.agree}</strong></span>
                    <span class="px-2 py-1 rounded-full bg-red-500/10 text-red-300">Disagree: <strong>${votes.disagree}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg" data-vote="agree" data-id="${item.id}">Agree</button>
                    <button class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg" data-vote="disagree" data-id="${item.id}">Disagree</button>
                </div>`;
        }
        card.appendChild(votesRow);

        if (!isDemo) {
            const shareRow = document.createElement('div');
            shareRow.className = 'flex items-center gap-2 text-xs text-gray-400';
            shareRow.innerHTML = `<button class="underline hover:text-white" data-copy-share="${item.id}">Copy link</button>`;
            card.appendChild(shareRow);
        }

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
    checkAuth();
    updateJudgeUI();
    loadJudgesFromApi();
    loadFeed();
    renderSamples([]);
    hydrateInitialView();

    const judgeForm = document.getElementById('judgeForm');
    if (judgeForm) {
        judgeForm.addEventListener('submit', judgeNow);
    }
    
    const optionA = document.getElementById('optionA');
    const optionB = document.getElementById('optionB');
    if (optionA) {
        optionA.addEventListener('input', updateSubmitButtonState);
    }
    if (optionB) {
        optionB.addEventListener('input', updateSubmitButtonState);
    }
    
    updateSubmitButtonState();
    
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
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal('loginModal');
            hideModal('signupModal');
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
