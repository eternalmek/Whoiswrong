// ==========================================
// Who Is Wrong? - Frontend Application
// ==========================================

// --- Configuration ---
const API_BASE = window.location.origin;

// --- Auth State ---
let currentUser = null;
let accessToken = localStorage.getItem('accessToken') || null;

// --- DOM Elements ---
const inputSection = document.getElementById('inputSection');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const userMenu = document.getElementById('userMenu');
const authButtons = document.getElementById('authButtons');
const signupPrompt = document.getElementById('signupPrompt');

// --- Judge State ---
const JUDGE_SELECTED_KEY = 'selectedJudgeId';
const UNLOCKED_KEY = 'unlockedJudgeIds';
const ALL_ACCESS_KEY = 'hasAllJudgeAccess';

// Free celebrity judges (permanently unlocked for everyone)
const FREE_CELEBRITY_JUDGES = ['normal', 'don_t', 'tech_billionaire'];

const availableJudges = Array.isArray(window.celebrityJudges) && window.celebrityJudges.length
    ? window.celebrityJudges
    : [{ id: 'normal', name: 'Normal AI Judge', emoji: '🤖', description: 'Decisive and balanced.', category: 'Default', systemPrompt: '' }];

function safeParseArray(value, fallback = []) {
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
        return fallback;
    }
}

let selectedJudgeId = localStorage.getItem(JUDGE_SELECTED_KEY) || 'normal';
if (!availableJudges.find((j) => j.id === selectedJudgeId)) {
    selectedJudgeId = 'normal';
}

let unlockedJudgeIds = safeParseArray(localStorage.getItem(UNLOCKED_KEY), []);
let hasAllAccess = localStorage.getItem(ALL_ACCESS_KEY) === 'true';

// ==========================================
// State Management
// ==========================================

function showLoading() {
    inputSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
}

function showResult(data) {
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('fade-in');

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
}

function showInput() {
    loadingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    inputSection.classList.add('fade-in');
}

function showError(msg) {
    loadingSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    errorSection.classList.remove('hidden');
    document.getElementById('errorMessage').innerText = msg;
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
    const isFreeJudge = FREE_CELEBRITY_JUDGES.includes(judge.id);
    const unlocked = hasAllAccess || unlockedJudgeIds.includes(judge.id) || isFreeJudge;

    let label;
    if (isFreeJudge) {
        label = 'Free';
    } else if (hasAllAccess || unlockedJudgeIds.includes(judge.id)) {
        label = 'Unlocked';
    } else {
        label = '$0.99';
    }

    return { judge, isFreeJudge, unlocked, label };
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
        hintEl.innerText = `${info.judge.emoji || '🤖'} ${info.judge.name} selected`;
    }
}

function updateFreeJudgesLabel() {
    const label = document.getElementById('freeTriesLabel');
    if (!label) return;

    if (hasAllAccess) {
        label.innerText = 'All judges unlocked';
        label.classList.remove('text-green-400');
        label.classList.add('text-yellow-300');
        return;
    }

    const freeCount = FREE_CELEBRITY_JUDGES.length;
    label.innerText = `${freeCount} judges free`;
    label.classList.add('text-green-400');
    label.classList.remove('text-red-400', 'text-yellow-300');
}

function renderJudgeChips() {
    const container = document.getElementById('judgeChips');
    if (!container) return;

    container.innerHTML = '';

    availableJudges.forEach((judge) => {
        const info = getJudgeAccessInfo(judge.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex-shrink-0 min-w-[180px] text-left p-3 rounded-xl border transition ${judge.id === selectedJudgeId ? 'border-red-500 bg-red-500/10' : 'border-gray-700 bg-gray-900/60 hover:border-red-500/60'}`;
        btn.addEventListener('click', () => {
            selectedJudgeId = judge.id;
            persistJudgeState();
            updateJudgeUI();
        });

        const title = document.createElement('div');
        title.className = 'flex items-center justify-between gap-2 mb-1';
        title.innerHTML = `<span class="font-semibold text-white flex items-center gap-2">${judge.emoji || '🤖'} ${judge.name}</span><span class="text-[11px] px-2 py-1 rounded-full ${info.unlocked ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-300'}">${info.label}</span>`;

        const desc = document.createElement('p');
        desc.className = 'text-sm text-gray-400';
        desc.innerText = judge.description || '';

        const category = document.createElement('div');
        category.className = 'text-[11px] uppercase tracking-wide text-gray-500 mt-1';
        category.innerText = judge.category || '';

        btn.appendChild(title);
        btn.appendChild(desc);
        btn.appendChild(category);
        container.appendChild(btn);
    });
}

function updateUnlockButtons() {
    const unlockOneBtn = document.getElementById('unlockSelectedJudge');
    const unlockAllBtn = document.getElementById('unlockAllJudges');
    const info = getJudgeAccessInfo(selectedJudgeId);

    if (unlockOneBtn) {
        unlockOneBtn.disabled = info.unlocked;
        unlockOneBtn.classList.toggle('opacity-50', info.unlocked);
        const label = unlockOneBtn.querySelector('span span');
        if (label) {
            label.innerText = info.unlocked ? 'Already unlocked' : 'Unlock this judge';
        }
    }

    if (unlockAllBtn) {
        unlockAllBtn.disabled = hasAllAccess;
        unlockAllBtn.classList.toggle('opacity-50', hasAllAccess);
    }
}

function updateJudgeUI() {
    renderJudgeChips();
    updateJudgeHint();
    updateFreeJudgesLabel();
    updateUnlockButtons();
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

    const info = getJudgeAccessInfo(judgeId);
    if (info.unlocked) {
        showToast('This judge is already unlocked', 'info');
        return;
    }

    try {
        showToast('Redirecting to checkout...', 'info');

        const response = await fetch(`${API_BASE}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mode: 'single',
                judgeId: judgeId,
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

    try {
        showToast('Redirecting to checkout...', 'info');

        const response = await fetch(`${API_BASE}/api/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

async function checkAuth() {
    if (!accessToken) {
        updateAuthUI();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        } else {
            // Token invalid/expired
            accessToken = null;
            localStorage.removeItem('accessToken');
            currentUser = null;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        currentUser = null;
    }
    
    updateAuthUI();
}

async function signup(email, password) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
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
            accessToken = data.access_token;
            localStorage.setItem('accessToken', accessToken);
            currentUser = data.user;
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
        const response = await fetch(`${API_BASE}/api/auth/login`, {
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
        
        accessToken = data.access_token;
        localStorage.setItem('accessToken', accessToken);
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
    accessToken = null;
    currentUser = null;
    localStorage.removeItem('accessToken');
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
        showToast("Please enter both Option A and Option B!", 'error');
        return;
    }

    const accessCheck = ensureJudgeAccess();
    if (!accessCheck.allowed) {
        showToast(accessCheck.reason || 'Unlock this judge to continue.', 'error');
        return;
    }

    showLoading();

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE}/api/judge`, {
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

function shareOnTwitter() {
    const wrong = document.getElementById('loserName').innerText || 'someone';
    const reason = document.getElementById('explanationText').innerText || 'No reason given.';
    const text = encodeURIComponent(`The AI Judge says ${wrong} is WRONG! 😂\n\n${reason}\n\nSettle your debates at:`);
    const url = encodeURIComponent(window.location.origin);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
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

// ==========================================
// Event Listeners
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    checkAuth();

    // Render judge selection UI
    updateJudgeUI();

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
