# WhoIsWrong.io - Social Features & Judge System Upgrade

## 🎯 Overview

This upgrade transforms WhoIsWrong.io into a viral, social-first platform with:
- **New Celebrity Judge System**: 3 free + 17 paid celebrity judges with unique personalities
- **Social Features**: Public feed, likes, comments, and content reporting
- **Viral Sharing**: TikTok, Instagram, and X (Twitter) optimized sharing
- **Enhanced UX**: Mobile-first, non-overwhelming design with progressive disclosure

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Stripe account
- OpenAI API key

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/eternalmek/Whoiswrong.git
   cd Whoiswrong
   npm install
   ```

2. **Environment Variables**
   
   Copy `.env.example` to `.env` and fill in:
   ```bash
   # Server
   PORT=8080
   FRONTEND_ORIGIN=http://localhost:3000

   # OpenAI
   OPENAI_API_KEY=your_openai_key
   OPENAI_MODEL=gpt-4o-mini

   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public
   STRIPE_PRICE_SINGLE_JUDGE=price_xxx
   STRIPE_PRICE_ALL_JUDGES=price_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   NEXT_PUBLIC_BASE_URL=http://localhost:8080
   ```

3. **Run Database Migration**
   
   In Supabase SQL Editor, run:
   ```bash
   # Or via Supabase CLI
   supabase db push
   
   # Or manually run the migration file
   # Copy contents of migrations/005_social_features.sql into Supabase SQL Editor
   ```

4. **Reset Judges Data**
   ```bash
   node src/scripts/resetJudges.js
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   npm start
   ```

6. **Visit**
   ```
   http://localhost:8080
   ```

## 📋 What's New

### 🎭 Judge System
- **3 FREE Judges**: AI Judge, Elon Musk, Taylor Swift
- **17 PAID Judges** ($0.99 each): Cristiano Ronaldo, Lionel Messi, Drake, Zendaya, The Rock, Kim Kardashian, MrBeast, Jordan Peterson, Gordon Ramsay, Amber Heard, Johnny Depp, Kylie Jenner, Kevin Hart, Snoop Dogg, Andrew Tate, Billie Eilish, Mr Wonderful
- **Personality-Based AI**: Each judge has unique prompts and response styles
- **Cartoon Avatars**: Ready for custom illustration (descriptions provided)
- **Color Themes**: Each judge has a signature color for branding

### 🌐 Social Features
- **Public Feed ("Internet Court Wall")**: Browse all public debates
- **Likes**: Heart debates you enjoy
- **Comments**: Thread-based commenting system (1 level deep)
- **Reports**: Flag inappropriate content for moderation
- **Anonymous Posting**: Option to hide identity on public debates
- **Categories**: Organize debates by topic

### 🎨 Viral Sharing
- **X (Twitter)**: One-click share with pre-filled text
- **TikTok**: Download share card for manual upload
- **Instagram**: Download share card for stories/posts
- **Share Cards**: Branded PNG images with judge colors and verdict
- **Copy Link**: Direct debate URL for sharing

### 🔐 Security
- **Row Level Security (RLS)**: All tables protected at database level
- **XSS Prevention**: HTML sanitization for user-generated content
- **Rate Limiting**: Prevents API abuse
- **Auth Middleware**: Protected routes require authentication
- **Input Validation**: All user inputs validated server-side

## 📁 Project Structure

```
Whoiswrong/
├── migrations/
│   ├── 001_create_judgements.sql
│   ├── 002_create_payments.sql
│   ├── 003_add_judges_and_votes.sql
│   ├── 004_add_judges_pricing.sql
│   └── 005_social_features.sql          # NEW: Social features schema
├── public/
│   ├── index.html                        # Main app page
│   ├── app.js                            # Frontend logic
│   ├── celebrityJudges.js                # Legacy judges (kept for reference)
│   └── newCelebrityJudges.js             # NEW: Updated judges list
├── src/
│   ├── data/
│   │   ├── judges.js                     # Backend judges data
│   │   └── newJudges.js                  # NEW: New judges definitions
│   ├── middleware/
│   │   └── auth.js                       # Auth middleware
│   ├── routes/
│   │   ├── judge.js                      # Judge verdicts (UPDATED)
│   │   ├── judges.js                     # Judge catalog
│   │   ├── feed.js                       # NEW: Public feed API
│   │   ├── likes.js                      # NEW: Likes API
│   │   ├── comments.js                   # NEW: Comments API
│   │   ├── reports.js                    # NEW: Reports API
│   │   ├── auth.js                       # Authentication
│   │   ├── checkout.js                   # Stripe checkout
│   │   └── ...
│   ├── services/
│   │   ├── debates.js                    # NEW: Debate management
│   │   ├── judges.js                     # Judge operations
│   │   ├── likes.js                      # NEW: Like operations
│   │   ├── comments.js                   # NEW: Comment operations
│   │   └── reports.js                    # NEW: Report operations
│   ├── scripts/
│   │   └── resetJudges.js                # NEW: Database reset script
│   ├── server.js                         # Express server
│   ├── supabaseClient.js                 # Supabase config
│   └── openaiClient.js                   # OpenAI config
├── IMPLEMENTATION_GUIDE.md               # NEW: Detailed implementation guide
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Debate & Feed
- `POST /api/judge` - Submit debate for judgement
- `GET /api/feed` - Get public debates feed
- `GET /api/feed/:id` - Get single debate

### Social Interactions
- `POST /api/likes` - Like a debate
- `DELETE /api/likes` - Unlike a debate
- `GET /api/likes/:debateId/status` - Check if user liked
- `POST /api/comments` - Add comment
- `GET /api/comments/:debateId` - Get debate comments
- `GET /api/comments/:commentId/replies` - Get comment replies
- `DELETE /api/comments/:commentId` - Delete own comment
- `POST /api/reports` - Report content

### Judges & Purchases
- `GET /api/judges` - List all judges
- `POST /api/checkout` - Create Stripe checkout
- `GET /api/purchases` - Get user's unlocked judges

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

## 🗄️ Database Schema

### New Tables
- `profiles` - User profiles
- `debates` - Public debate feed entries
- `comments` - Debate comments with threading
- `likes` - Debate likes
- `reports` - Content reports
- `judge_unlocks` - User's purchased judges

### Updated Tables
- `judges` - Added `color_theme`, `is_ai_default`, `price_id`

### RLS Policies
All tables have Row Level Security enabled:
- Users can only edit their own data
- Public debates visible to all
- Private debates visible only to owner
- Comments and likes visible to all

## 🎨 Frontend Implementation Status

### ✅ Completed
- New celebrity judges data structure
- HTML updated to use new judges
- Backend APIs ready and tested
- Database schema migrated
- Code review passed
- Security scan passed (0 vulnerabilities)

### 🔄 In Progress
See `IMPLEMENTATION_GUIDE.md` for detailed steps:
- Update app.js judge handling
- Add public/anonymous toggles to form
- Implement judge picker UI (free first, paid collapsed)
- Build Internet Court Wall feed
- Add like/comment UI
- Implement share functionality
- Generate share card images

## 🛠️ Development

### Running Tests
```bash
# No test suite currently - manual testing required
# TODO: Add Jest/Mocha tests
```

### Code Quality
```bash
# Linting (if ESLint configured)
npm run lint

# Code Review
# Use GitHub Copilot code_review tool

# Security Scan
# Use GitHub Copilot codeql_checker tool
```

### Database Management
```bash
# Start local Supabase (if using local setup)
npm run db:start

# Create migration
npm run db:diff

# Apply migrations
npm run db:push

# Reset judges
node src/scripts/resetJudges.js
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Environment Variables in Vercel
Add all variables from `.env.example` to Vercel project settings.

### Post-Deployment Steps
1. Run migration in Supabase production database
2. Run reset judges script pointing to production
3. Configure Stripe webhook URL
4. Test all features in production

## 📱 Mobile Support
- Responsive design (320px+)
- Touch-friendly targets (48px min)
- Bottom sheet modals on mobile
- Native share on supported devices
- Optimized for iOS and Android

## 🎯 Judge Personality System

Each judge has a unique personality prompt that shapes their verdicts:

- **AI Judge**: Impartial, logical, neutral
- **Elon Musk**: Analytical, futuristic, blunt
- **Taylor Swift**: Emotional, empathetic, poetic
- **Cristiano Ronaldo**: Confident, competitive, disciplined
- **Lionel Messi**: Calm, humble, team-focused
- **Drake**: Soft, emotional, reflective
- **Zendaya**: Smart, grounded, boundary-aware
- **The Rock**: Motivational, humorous, coach-like
- **Kim Kardashian**: Glamorous, image-aware, direct
- **MrBeast**: YouTube-style, playful, challenge-focused
- **Jordan Peterson**: Philosophical, responsibility-focused
- **Gordon Ramsay**: Brutally honest, comedic, chef energy
- **Amber Heard**: Dramatic, explores miscommunication
- **Johnny Depp**: Calm, witty, theatrical
- **Kylie Jenner**: Influencer-style, image-conscious
- **Kevin Hart**: Comedic, animated, friendly
- **Snoop Dogg**: Relaxed, chill, anti-drama
- **Andrew Tate**: Direct, responsibility-focused (safe version)
- **Billie Eilish**: Introspective, calm, dark-humored
- **Mr Wonderful**: Sarcastic, business-pragmatic

## 🐛 Known Issues
- Cartoon avatars not yet generated (using placeholders)
- Frontend social features need implementation
- Share card image generation not implemented
- Stripe integration needs testing with new judge system

## 📝 Contributing
1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Add tests if applicable
5. Submit pull request

## 📄 License
MIT License - see LICENSE file

## 🔗 Links
- [Live Site](https://www.whoiswrong.io)
- [GitHub](https://github.com/eternalmek/Whoiswrong)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [TikTok](https://www.tiktok.com/@who.is.wrong1)

## 💬 Support
For issues or questions:
- Open GitHub issue
- Contact via TikTok (@who.is.wrong1)

---

Built with ❤️ for viral debates and TikTok content creation.
