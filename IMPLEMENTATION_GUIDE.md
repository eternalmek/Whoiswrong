# Who Is Wrong - Social Features Upgrade Implementation Guide

## ✅ Completed Work

### 1. Database Schema (Migration 005)
**File:** `migrations/005_social_features.sql`
- ✅ Added `profiles` table for user profiles
- ✅ Extended `judges` table with `color_theme`, `is_ai_default`, `price_id`
- ✅ Created `judge_unlocks` table (replaces `unlocked_judges`)
- ✅ Created `debates` table for public feed (extends `judgements`)
- ✅ Created `comments` table with threading support
- ✅ Created `likes` table
- ✅ Created `reports` table
- ✅ Added RLS policies for all tables
- ✅ Added triggers for like_count and comment_count auto-increment

**To Deploy:** Run migration in Supabase SQL editor or via CLI

### 2. New Judge System
**Files:** 
- `src/data/newJudges.js` - Backend judge definitions
- `public/newCelebrityJudges.js` - Frontend judge definitions  
- `src/scripts/resetJudges.js` - Database reset script

**Judge List (3 Free + 17 Paid):**
FREE:
1. AI Judge (ai_judge) - Default
2. Elon Musk (elon_musk)
3. Taylor Swift (taylor_swift)

PAID ($0.99 each):
4. Cristiano Ronaldo
5. Lionel Messi
6. Drake
7. Zendaya
8. The Rock
9. Kim Kardashian
10. MrBeast
11. Jordan Peterson
12. Gordon Ramsay
13. Amber Heard
14. Johnny Depp
15. Kylie Jenner
16. Kevin Hart
17. Snoop Dogg
18. Andrew Tate
19. Billie Eilish
20. Mr Wonderful

**To Deploy:** Run `node src/scripts/resetJudges.js` after migration

### 3. Backend API Services
**New Service Files:**
- `src/services/debates.js` - Extended with createDebate, getPublicDebates, getDebateById
- `src/services/likes.js` - addLike, removeLike, hasUserLiked, getDebateLikes
- `src/services/comments.js` - createComment, getDebateComments, getCommentReplies, deleteComment
- `src/services/reports.js` - createReport, getReports, updateReportStatus

**New Route Files:**
- `src/routes/feed.js` - GET /api/feed, GET /api/feed/:id
- `src/routes/likes.js` - POST/DELETE /api/likes
- `src/routes/comments.js` - POST/DELETE /api/comments
- `src/routes/reports.js` - POST /api/reports

**Updated Files:**
- `src/routes/judge.js` - Now saves to debates table with public/anonymous options
- `src/server.js` - Registered all new routes

All routes use existing auth middleware (requireUser, optionalUser).

---

## 🔄 Remaining Frontend Work

### Priority 1: Core UI Updates

#### A. Update app.js Judge Handling
**Location:** `public/app.js` (lines ~40-100)

**Changes Needed:**
1. Update fallback judges to use new list:
```javascript
const FALLBACK_JUDGES = (Array.isArray(window.celebrityJudges) && window.celebrityJudges.length)
    ? window.celebrityJudges
    : [{ id: 'ai_judge', slug: 'ai_judge', name: 'AI Judge', emoji: '🤖', is_free: true }];
```

2. Update FREE_JUDGES_COUNT to 3 (was 4):
```javascript
const FREE_JUDGES_COUNT = 3;
```

3. Update default selectedJudgeId to 'ai_judge' (was 'normal'):
```javascript
let selectedJudgeId = localStorage.getItem(JUDGE_SELECTED_KEY) || 'ai_judge';
```

#### B. Add Public/Anonymous Toggle to Form
**Location:** `public/index.html` (after line ~451, inside form)

**Add HTML:**
```html
<!-- More Options -->
<details class="bg-gray-800/50 border border-gray-700 rounded-xl p-3 sm:p-4 mt-4">
    <summary class="cursor-pointer text-sm font-bold text-gray-400 uppercase flex items-center justify-between">
        <span><i class="fas fa-cog mr-2"></i>More Options</span>
        <i class="fas fa-chevron-down"></i>
    </summary>
    <div class="mt-3 space-y-3">
        <!-- Public Toggle -->
        <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="makePublicToggle" checked class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500">
            <div>
                <div class="text-sm font-medium text-white">Make Public</div>
                <div class="text-xs text-gray-400">Share on the Internet Court Wall</div>
            </div>
        </label>
        
        <!-- Anonymous Toggle -->
        <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" id="anonymousToggle" class="w-5 h-5 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500">
            <div>
                <div class="text-sm font-medium text-white">Post Anonymously</div>
                <div class="text-xs text-gray-400">Hide your username on public feed</div>
            </div>
        </label>
        
        <!-- Category Select (Optional) -->
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Category (Optional)</label>
            <select id="categorySelect" class="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm">
                <option value="">No category</option>
                <option value="relationships">Relationships</option>
                <option value="sports">Sports</option>
                <option value="entertainment">Entertainment</option>
                <option value="politics">Politics</option>
                <option value="food">Food & Cooking</option>
                <option value="tech">Technology</option>
                <option value="other">Other</option>
            </select>
        </div>
    </div>
</details>
```

**Add JavaScript (in app.js, inside submitJudge function):**
```javascript
// Get form values
const makePublic = document.getElementById('makePublicToggle')?.checked ?? true;
const isAnonymous = document.getElementById('anonymousToggle')?.checked ?? false;
const category = document.getElementById('categorySelect')?.value || null;

// Add to fetch body
const body = JSON.stringify({
    context,
    optionA,
    optionB,
    judgeId: selectedJudgeId,
    makePublic,
    isAnonymous,
    category,
});
```

#### C. Update Judge Picker UI
**Location:** `public/app.js` (updateJudgeUI function)

**Changes:**
1. Filter judges: free judges first, then paid judges
2. Add "More Judges" expandable section for paid judges
3. Show lock icon on locked judges
4. Add color theme to judge cards

**Sample Implementation:**
```javascript
function updateJudgeUI() {
    const container = document.getElementById('judgeChips');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Split free and paid judges
    const freeJudges = availableJudges.filter(j => j.is_free || j.is_default_free);
    const paidJudges = availableJudges.filter(j => !j.is_free && !j.is_default_free);
    
    // Render free judges
    freeJudges.forEach(judge => {
        container.appendChild(createJudgeCard(judge, false));
    });
    
    // Add "More Judges" section if there are paid judges
    if (paidJudges.length > 0) {
        const moreSection = document.createElement('details');
        moreSection.className = 'col-span-full mt-2';
        moreSection.innerHTML = `
            <summary class="cursor-pointer text-sm font-bold text-gray-400 uppercase py-2">
                <i class="fas fa-crown text-yellow-400 mr-2"></i>More Judges (Premium)
            </summary>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"></div>
        `;
        
        const paidContainer = moreSection.querySelector('div');
        paidJudges.forEach(judge => {
            paidContainer.appendChild(createJudgeCard(judge, true));
        });
        
        container.appendChild(moreSection);
    }
}

function createJudgeCard(judge, showLock) {
    const isUnlocked = isJudgeUnlocked(judge.id);
    const isSelected = selectedJudgeId === judge.id;
    const colorTheme = judge.color_theme || '#6B7280';
    
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `judge-card relative p-3 rounded-lg border-2 transition ${
        isSelected 
            ? 'border-red-500 bg-red-500/10' 
            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
    } ${!isUnlocked ? 'judge-locked' : ''}`;
    
    card.style.borderColor = isSelected ? colorTheme : '';
    
    card.innerHTML = `
        ${showLock && !isUnlocked ? '<i class="lock-icon fas fa-lock text-yellow-400 text-sm"></i>' : ''}
        <img src="${getAvatarUrl(judge)}" alt="${judge.name}" class="w-12 h-12 rounded-full mx-auto mb-2">
        <div class="text-xs font-bold text-white text-center">${judge.name}</div>
        ${judge.is_free ? '<div class="text-[10px] text-green-400 text-center mt-1">FREE</div>' : ''}
    `;
    
    card.addEventListener('click', () => {
        if (!isUnlocked && showLock) {
            showPurchaseModal(judge);
        } else {
            selectJudge(judge.id);
        }
    });
    
    return card;
}
```

### Priority 2: Social Features UI

#### D. Build Internet Court Wall (Public Feed)
**Location:** Create new section in `public/index.html` or new page

**API Integration:**
```javascript
async function loadFeed(refresh = false) {
    const feedGrid = document.getElementById('feedGrid');
    const feedEmpty = document.getElementById('feedEmpty');
    
    try {
        const response = await fetch(`${API_BASE}/api/feed?limit=20`);
        const data = await response.json();
        
        if (!data.debates || data.debates.length === 0) {
            feedEmpty.classList.remove('hidden');
            feedGrid.innerHTML = '';
            return;
        }
        
        feedEmpty.classList.add('hidden');
        feedGrid.innerHTML = '';
        
        data.debates.forEach(debate => {
            feedGrid.appendChild(createDebateCard(debate));
        });
    } catch (error) {
        console.error('Failed to load feed:', error);
        showToast('Failed to load feed', 'error');
    }
}

function createDebateCard(debate) {
    const card = document.createElement('div');
    card.className = 'glass-panel p-4 rounded-xl';
    card.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
            <img src="${debate.judge_avatar || getAvatarUrl({name: debate.judge_name})}" 
                 class="w-8 h-8 rounded-full">
            <div>
                <div class="text-sm font-bold text-white">${debate.judge_name || 'AI Judge'}</div>
                <div class="text-xs text-gray-400">${new Date(debate.created_at).toLocaleDateString()}</div>
            </div>
        </div>
        
        ${debate.context ? `<p class="text-sm text-gray-300 mb-2">${debate.context}</p>` : ''}
        
        <div class="bg-gray-800/50 rounded-lg p-3 mb-3">
            <div class="flex items-center gap-2 text-xs mb-1">
                <span class="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">A</span>
                <span class="text-gray-300">${debate.option_a}</span>
            </div>
            <div class="flex items-center gap-2 text-xs">
                <span class="bg-red-500/20 text-red-400 px-2 py-0.5 rounded">B</span>
                <span class="text-gray-300">${debate.option_b}</span>
            </div>
        </div>
        
        <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-4">
                <button class="like-btn flex items-center gap-1 text-gray-400 hover:text-red-400" data-debate-id="${debate.id}">
                    <i class="fas fa-heart"></i>
                    <span>${debate.like_count || 0}</span>
                </button>
                <button class="comment-btn flex items-center gap-1 text-gray-400 hover:text-blue-400" data-debate-id="${debate.id}">
                    <i class="fas fa-comment"></i>
                    <span>${debate.comment_count || 0}</span>
                </button>
            </div>
            <button class="share-btn text-gray-400 hover:text-white" data-debate-id="${debate.id}">
                <i class="fas fa-share-alt"></i>
            </button>
        </div>
    `;
    
    return card;
}
```

#### E. Like/Unlike Functionality
```javascript
async function toggleLike(debateId) {
    if (!accessToken) {
        showModal('loginModal');
        return;
    }
    
    try {
        // Check current status first
        const statusRes = await fetch(`${API_BASE}/api/likes/${debateId}/status`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const { liked } = await statusRes.json();
        
        // Toggle
        const method = liked ? 'DELETE' : 'POST';
        const response = await fetch(`${API_BASE}/api/likes`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ debateId })
        });
        
        if (response.ok) {
            loadFeed(true); // Refresh feed
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        showToast('Failed to update like', 'error');
    }
}
```

#### F. Comments System
```javascript
async function loadComments(debateId) {
    try {
        const response = await fetch(`${API_BASE}/api/comments/${debateId}`);
        const data = await response.json();
        
        const commentsContainer = document.getElementById('commentsContainer');
        commentsContainer.innerHTML = '';
        
        if (data.comments.length === 0) {
            commentsContainer.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">No comments yet. Be the first!</p>';
            return;
        }
        
        data.comments.forEach(comment => {
            commentsContainer.appendChild(createCommentElement(comment));
        });
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

async function postComment(debateId, body, parentId = null) {
    if (!accessToken) {
        showModal('loginModal');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ debateId, body, parentId })
        });
        
        if (response.ok) {
            loadComments(debateId); // Refresh comments
            document.getElementById('commentInput').value = '';
        }
    } catch (error) {
        console.error('Failed to post comment:', error);
        showToast('Failed to post comment', 'error');
    }
}
```

### Priority 3: Share Functionality

#### G. Social Share Buttons
**Update result section in index.html:**
```html
<!-- Share Buttons -->
<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
    <button onclick="shareToX()" class="bg-black hover:bg-gray-900 text-white p-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <span>Share</span>
    </button>
    <button onclick="shareToTikTok()" class="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-600 hover:to-pink-600 text-white p-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2">
        <i class="fab fa-tiktok"></i>
        <span>TikTok</span>
    </button>
    <button onclick="shareToInstagram()" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2">
        <i class="fab fa-instagram"></i>
        <span>Instagram</span>
    </button>
    <button onclick="downloadShareCard()" class="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2">
        <i class="fas fa-download"></i>
        <span>Download</span>
    </button>
</div>
```

**JavaScript (add to app.js):**
```javascript
function shareToX() {
    const text = `This AI judge decided who was wrong in my argument 😂 Try it:`;
    const url = `https://www.whoiswrong.io`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
}

function shareToTikTok() {
    // TikTok doesn't have direct share URL, so download image for manual upload
    showToast('Download the image below and upload to TikTok!', 'info');
    downloadShareCard();
}

function shareToInstagram() {
    // Instagram doesn't have direct share URL, so download image for manual upload
    showToast('Download the image below and upload to Instagram!', 'info');
    downloadShareCard();
}

async function downloadShareCard() {
    // Use html2canvas or create canvas manually
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1080;
    canvas.height = 1080;
    
    // Background color (judge's color theme)
    ctx.fillStyle = currentJudge?.color_theme || '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add verdict content (simplified)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Who Is Wrong?', canvas.width / 2, 100);
    
    // ... add more content (judge name, verdict summary, logo)
    
    // Download
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whoiswrong-verdict.png';
        a.click();
        URL.revokeObjectURL(url);
    });
}
```

---

## 🔧 Deployment Checklist

1. **Run Database Migration**
   ```bash
   # In Supabase SQL Editor or via CLI
   supabase db push
   # Or manually run migrations/005_social_features.sql
   ```

2. **Reset Judges Data**
   ```bash
   node src/scripts/resetJudges.js
   ```

3. **Environment Variables**
   Ensure these are set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_SINGLE_JUDGE` (for single judge unlock)
   - `STRIPE_PRICE_ALL_JUDGES` (for all judges subscription)
   - `OPENAI_API_KEY`

4. **Test Locally**
   ```bash
   npm start
   # Visit http://localhost:8080
   ```

5. **Deploy to Vercel**
   ```bash
   # Push changes
   git push origin main
   # Vercel will auto-deploy
   ```

6. **Verify Stripe Integration**
   - Test single judge purchase
   - Test all judges subscription
   - Check webhook endpoint is registered

7. **Test Social Features**
   - Create public debate
   - Like a debate
   - Comment on a debate
   - Report content
   - Check public feed displays correctly

---

## 📝 Additional Notes

### Cartoon Avatar Generation
Avatar descriptions are ready in `src/data/newJudges.js`. Options for generating:
1. Use AI image generator (DALL-E, Midjourney, Stable Diffusion)
2. Hire illustrator for consistent style
3. Keep using Dicebear placeholders temporarily

Prompt template:
```
Create a clean, high-resolution, 1:1 cartoon portrait of [DESCRIPTION],
in a modern flat illustration style, soft shading, bold outlines,
simple solid-color background matching [COLOR_THEME], no text, no logos.
```

### Mobile Optimization
All new UI components should:
- Use touch-friendly targets (min 48px)
- Work on small screens (320px+)
- Use responsive grid layouts
- Test on iOS and Android

### Performance
- Implement infinite scroll for feed (use offset pagination)
- Cache judges list in localStorage
- Debounce like button clicks
- Lazy load comment threads

### Security
- All RLS policies are in place
- API routes use auth middleware
- User input is validated
- No XSS vulnerabilities in comment rendering
- Rate limiting already configured

---

## 🐛 Known Issues to Address

1. **Judge Service**: Update `src/services/judges.js` to handle `color_theme` and `is_ai_default` fields
2. **Stripe Integration**: Update checkout flow to use judge-specific price IDs
3. **Public Debates Migration**: May need to migrate existing `public_debates` entries to new `debates` table
4. **Avatar URLs**: Replace placeholders with actual cartoon avatars
5. **Share Card Generation**: Implement proper canvas-based image generation with judge colors

---

## 🚀 Quick Start for Frontend Developer

1. Review `public/newCelebrityJudges.js` - new judge list
2. Update `public/app.js` sections marked with // TODO
3. Add HTML sections from Priority 1 tasks
4. Test locally with `npm start`
5. Implement social features from Priority 2
6. Add share functionality from Priority 3

All backend APIs are ready and documented in this guide.
