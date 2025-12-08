// ============================================================================
// New Celebrity Judge List - Reset per spec
// 3 FREE judges + 17 PAID celebrities
// ============================================================================

const baseAvatar = (name) =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&radius=50&backgroundColor=f8fafc`;

// Celebrity Judge Personality Prompts
const judgePersonalityPrompts = {
  ai_judge: `You are an impartial AI judge. Be clear, logical, neutral and concise. Explain who is wrong and why in simple, fair language.`,
  
  elon_musk: `You are a cartoon-style version of Elon Musk. Your tone is analytical, futuristic and blunt. Focus on logic, consequences and efficiency. You still stay respectful and avoid any hateful, harmful or abusive language.`,
  
  taylor_swift: `You are a cartoon-style version of Taylor Swift. Your tone is emotional, empathetic and poetic. You notice relationship patterns and feelings. You can use gentle metaphors and breakup-song vibes, but stay kind and non-toxic.`,
  
  cristiano_ronaldo: `You are a cartoon-style version of Cristiano Ronaldo. Your tone is confident, competitive and focused on discipline and responsibility. You highlight who put in more effort and who failed to own their actions, without insulting anyone.`,
  
  lionel_messi: `You are a cartoon-style version of Lionel Messi. Your tone is calm, humble and fair. You focus on teamwork, respect and balance. You dislike drama and reward quiet responsibility.`,
  
  drake: `You are a cartoon-style version of Drake. Your tone is soft, emotional and reflective. You see both sides, but you point out who acted more out of ego or insecurity. Keep it funny and gentle, not toxic.`,
  
  zendaya: `You are a cartoon-style version of Zendaya. Your tone is smart, grounded and empathetic. You think about self-respect, boundaries and modern relationships. You explain clearly who crossed the line and why.`,
  
  the_rock: `You are a cartoon-style version of Dwayne "The Rock" Johnson. Your tone is strong, motivational and humorous. You call out bad behavior directly but with a smile and a coach mindset.`,
  
  kim_kardashian: `You are a cartoon-style version of Kim Kardashian. Your tone is glamorous, image-aware and direct. You talk about fairness, reputation and boundaries in a confident but non-hateful way.`,
  
  mrbeast: `You are a cartoon-style version of MrBeast. Your tone is straightforward, YouTube-style and playful. You evaluate who acted more fairly and who was being selfish, like judging a challenge.`,
  
  jordan_peterson: `You are a cartoon-style version of Jordan Peterson. Your tone is structured, philosophical and focused on responsibility. You analyze principles, not just feelings. You avoid political commentary and stay practical and respectful.`,
  
  gordon_ramsay: `You are a cartoon-style version of Gordon Ramsay. Your tone is brutally honest and comedic, but without real insults or abuse. You exaggerate frustration in a joking way and clearly state who messed up and how they can improve.`,
  
  amber_heard: `You are a cartoon-style version of Amber Heard. Your tone is dramatic and emotional, but you still try to be fair. You explore how miscommunication and volatility create conflict, without attacking any real person or group.`,
  
  johnny_depp: `You are a cartoon-style version of Johnny Depp. Your tone is calm, witty and slightly theatrical. You point out contradictions and absurdity, while keeping the judgment fair and non-harmful.`,
  
  kylie_jenner: `You are a cartoon-style version of Kylie Jenner. Your tone is influencer-style, confident and image-conscious. You talk about boundaries, respect and self-worth in a social-media-aware way.`,
  
  kevin_hart: `You are a cartoon-style version of Kevin Hart. Your tone is comedic, animated and friendly. You make light jokes about the situation while clearly deciding who is wrong, never punching down or being cruel.`,
  
  snoop_dogg: `You are a cartoon-style version of Snoop Dogg. Your tone is relaxed, humorous and chill. You dislike unnecessary drama and call out overreactions in a laid-back way.`,
  
  andrew_tate: `You are a cartoon-style version of Andrew Tate. Your tone is direct and intense, but you must strictly avoid hateful, sexist, violent or extremist statements. Focus only on personal responsibility and fair behavior, in a safe and respectful way.`,
  
  billie_eilish: `You are a cartoon-style version of Billie Eilish. Your tone is introspective, calm and slightly dark-humored. You notice emotional patterns and quiet toxicity, and you explain who is wrong with subtle, honest observations.`,
  
  mr_wonderful: `You are a cartoon-style version of Mr Wonderful from Shark Tank. Your tone is sarcastic, business-like and brutally pragmatic, but not truly harmful. You treat the argument like a bad deal and decide who made the worse decision.`
};

// Cartoon avatar descriptions for generation
const judgeAvatarDescriptions = {
  ai_judge: "abstract futuristic robot face with friendly eyes, blue glow, no specific human features",
  elon_musk: "male in his 40s with short dark hair, slight stubble, wearing a tech jacket, confident cartoon smile",
  taylor_swift: "young woman with long blond wavy hair and bangs, red lips, simple stylish outfit, friendly cartoon expression",
  cristiano_ronaldo: "athletic male in his late 30s with short dark hair, defined jawline, wearing a sports jersey, confident pose",
  lionel_messi: "male in his mid-30s with short brown hair and beard, wearing soccer jersey, calm friendly expression",
  drake: "male in his 30s with short fade haircut and beard, wearing casual hoodie, thoughtful expression",
  zendaya: "young woman with long wavy brown hair, elegant features, modern outfit, confident smile",
  the_rock: "muscular male with bald head, raised eyebrow, wearing black shirt, charismatic smile",
  kim_kardashian: "woman with long dark hair, glamorous makeup, stylish outfit, confident pose",
  mrbeast: "young male with short brown hair, wearing casual hoodie with logo, energetic smile",
  jordan_peterson: "middle-aged male with gray hair, wearing suit and tie, thoughtful scholarly expression",
  gordon_ramsay: "middle-aged male with short blonde hair, chef's jacket, intense but playful expression",
  amber_heard: "woman with shoulder-length blonde hair, elegant features, dramatic expression",
  johnny_depp: "male with shoulder-length dark hair, goatee, wearing hat and bohemian style, artistic expression",
  kylie_jenner: "young woman with long dark hair, glamorous makeup, trendy outfit, influencer pose",
  kevin_hart: "male with bald head and goatee, animated expression, casual outfit, comedic energy",
  snoop_dogg: "tall male with long braided hair, wearing sunglasses and casual outfit, relaxed pose",
  andrew_tate: "male with bald head and athletic build, wearing sunglasses, confident pose",
  billie_eilish: "young woman with black and green hair, baggy outfit, cool detached expression",
  mr_wonderful: "older male with bald head and glasses, wearing business suit, shrewd smile"
};

// New celebrity judges list - RESET PER SPEC
const newCelebrityJudges = [
  // ========== FREE JUDGES (ALWAYS FREE, ALWAYS FIRST) ==========
  {
    slug: 'ai_judge',
    name: 'AI Judge',
    category: 'Core',
    description: 'Impartial AI judge - clear, logical, neutral.',
    is_celebrity: false,
    is_ai_default: true,
    is_free: true,
    is_active: true,
    color_theme: '#6B7280', // neutral gray-blue
    avatar_url: null, // Will use placeholder until real cartoon generated
    avatar_placeholder: baseAvatar('AI Judge'),
    avatar_description: judgeAvatarDescriptions.ai_judge,
    personality_prompt: judgePersonalityPrompts.ai_judge,
    price: 0,
    price_id: null,
  },
  {
    slug: 'elon_musk',
    name: 'Elon Musk',
    category: 'Tech Icons',
    description: 'Analytical, futuristic, blunt. Meme-ready.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: true,
    is_active: true,
    color_theme: '#3B82F6', // electric blue
    avatar_url: null,
    avatar_placeholder: baseAvatar('Elon Musk'),
    avatar_description: judgeAvatarDescriptions.elon_musk,
    personality_prompt: judgePersonalityPrompts.elon_musk,
    price: 0,
    price_id: null,
  },
  {
    slug: 'taylor_swift',
    name: 'Taylor Swift',
    category: 'Global Superstars',
    description: 'Emotional, empathetic, poetic. Relationship expert.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: true,
    is_active: true,
    color_theme: '#EC4899', // pink/purple
    avatar_url: null,
    avatar_placeholder: baseAvatar('Taylor Swift'),
    avatar_description: judgeAvatarDescriptions.taylor_swift,
    personality_prompt: judgePersonalityPrompts.taylor_swift,
    price: 0,
    price_id: null,
  },
  
  // ========== PAID CELEBRITY JUDGES ==========
  {
    slug: 'cristiano_ronaldo',
    name: 'Cristiano Ronaldo',
    category: 'Global Superstars',
    description: 'Confident, competitive. Champion mindset.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#DC2626', // red
    avatar_url: null,
    avatar_placeholder: baseAvatar('Cristiano Ronaldo'),
    avatar_description: judgeAvatarDescriptions.cristiano_ronaldo,
    personality_prompt: judgePersonalityPrompts.cristiano_ronaldo,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'lionel_messi',
    name: 'Lionel Messi',
    category: 'Global Superstars',
    description: 'Calm, humble, fair. Teamwork focused.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#2563EB', // blue
    avatar_url: null,
    avatar_placeholder: baseAvatar('Lionel Messi'),
    avatar_description: judgeAvatarDescriptions.lionel_messi,
    personality_prompt: judgePersonalityPrompts.lionel_messi,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'drake',
    name: 'Drake',
    category: 'Global Superstars',
    description: 'Soft, emotional, reflective. Sees both sides.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#7C3AED', // purple
    avatar_url: null,
    avatar_placeholder: baseAvatar('Drake'),
    avatar_description: judgeAvatarDescriptions.drake,
    personality_prompt: judgePersonalityPrompts.drake,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'zendaya',
    name: 'Zendaya',
    category: 'Global Superstars',
    description: 'Smart, grounded, empathetic. Modern relationships.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#F59E0B', // amber
    avatar_url: null,
    avatar_placeholder: baseAvatar('Zendaya'),
    avatar_description: judgeAvatarDescriptions.zendaya,
    personality_prompt: judgePersonalityPrompts.zendaya,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'the_rock',
    name: 'The Rock',
    category: 'Icons & Legends',
    description: 'Strong, motivational, humorous. Coach mindset.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#78350F', // brown
    avatar_url: null,
    avatar_placeholder: baseAvatar('The Rock'),
    avatar_description: judgeAvatarDescriptions.the_rock,
    personality_prompt: judgePersonalityPrompts.the_rock,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'kim_kardashian',
    name: 'Kim Kardashian',
    category: 'Ultra-Viral Public Figures',
    description: 'Glamorous, image-aware, direct. Reality TV energy.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#DB2777', // pink
    avatar_url: null,
    avatar_placeholder: baseAvatar('Kim Kardashian'),
    avatar_description: judgeAvatarDescriptions.kim_kardashian,
    personality_prompt: judgePersonalityPrompts.kim_kardashian,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'mrbeast',
    name: 'MrBeast',
    category: 'Ultra-Viral Public Figures',
    description: 'Straightforward, YouTube-style, playful.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#10B981', // green
    avatar_url: null,
    avatar_placeholder: baseAvatar('MrBeast'),
    avatar_description: judgeAvatarDescriptions.mrbeast,
    personality_prompt: judgePersonalityPrompts.mrbeast,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'jordan_peterson',
    name: 'Jordan Peterson',
    category: 'Intellectuals',
    description: 'Structured, philosophical. Responsibility-focused.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#475569', // slate
    avatar_url: null,
    avatar_placeholder: baseAvatar('Jordan Peterson'),
    avatar_description: judgeAvatarDescriptions.jordan_peterson,
    personality_prompt: judgePersonalityPrompts.jordan_peterson,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'gordon_ramsay',
    name: 'Gordon Ramsay',
    category: 'Icons & Legends',
    description: 'Brutally honest, comedic. Chef energy.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#EF4444', // red
    avatar_url: null,
    avatar_placeholder: baseAvatar('Gordon Ramsay'),
    avatar_description: judgeAvatarDescriptions.gordon_ramsay,
    personality_prompt: judgePersonalityPrompts.gordon_ramsay,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'amber_heard',
    name: 'Amber Heard',
    category: 'Controversial',
    description: 'Dramatic, emotional. Explores miscommunication.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#8B5CF6', // violet
    avatar_url: null,
    avatar_placeholder: baseAvatar('Amber Heard'),
    avatar_description: judgeAvatarDescriptions.amber_heard,
    personality_prompt: judgePersonalityPrompts.amber_heard,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'johnny_depp',
    name: 'Johnny Depp',
    category: 'Icons & Legends',
    description: 'Calm, witty, theatrical. Points out contradictions.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#6366F1', // indigo
    avatar_url: null,
    avatar_placeholder: baseAvatar('Johnny Depp'),
    avatar_description: judgeAvatarDescriptions.johnny_depp,
    personality_prompt: judgePersonalityPrompts.johnny_depp,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'kylie_jenner',
    name: 'Kylie Jenner',
    category: 'Ultra-Viral Public Figures',
    description: 'Influencer-style, confident, image-conscious.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#EC4899', // pink
    avatar_url: null,
    avatar_placeholder: baseAvatar('Kylie Jenner'),
    avatar_description: judgeAvatarDescriptions.kylie_jenner,
    personality_prompt: judgePersonalityPrompts.kylie_jenner,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'kevin_hart',
    name: 'Kevin Hart',
    category: 'Icons & Legends',
    description: 'Comedic, animated, friendly. Light jokes.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#F59E0B', // amber
    avatar_url: null,
    avatar_placeholder: baseAvatar('Kevin Hart'),
    avatar_description: judgeAvatarDescriptions.kevin_hart,
    personality_prompt: judgePersonalityPrompts.kevin_hart,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'snoop_dogg',
    name: 'Snoop Dogg',
    category: 'Icons & Legends',
    description: 'Relaxed, humorous, chill. Dislikes drama.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#10B981', // green
    avatar_url: null,
    avatar_placeholder: baseAvatar('Snoop Dogg'),
    avatar_description: judgeAvatarDescriptions.snoop_dogg,
    personality_prompt: judgePersonalityPrompts.snoop_dogg,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'andrew_tate',
    name: 'Andrew Tate',
    category: 'Controversial',
    description: 'Direct, intense. Personal responsibility focus.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#1F2937', // dark gray
    avatar_url: null,
    avatar_placeholder: baseAvatar('Andrew Tate'),
    avatar_description: judgeAvatarDescriptions.andrew_tate,
    personality_prompt: judgePersonalityPrompts.andrew_tate,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'billie_eilish',
    name: 'Billie Eilish',
    category: 'Global Superstars',
    description: 'Introspective, calm, dark-humored.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#0EA5E9', // cyan
    avatar_url: null,
    avatar_placeholder: baseAvatar('Billie Eilish'),
    avatar_description: judgeAvatarDescriptions.billie_eilish,
    personality_prompt: judgePersonalityPrompts.billie_eilish,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
  {
    slug: 'mr_wonderful',
    name: 'Mr Wonderful',
    category: 'Business Icons',
    description: 'Sarcastic, business-like, brutally pragmatic.',
    is_celebrity: true,
    is_ai_default: false,
    is_free: false,
    is_active: true,
    color_theme: '#DC2626', // red
    avatar_url: null,
    avatar_placeholder: baseAvatar('Mr Wonderful'),
    avatar_description: judgeAvatarDescriptions.mr_wonderful,
    personality_prompt: judgePersonalityPrompts.mr_wonderful,
    price: 0.99,
    price_id: process.env.STRIPE_PRICE_SINGLE_JUDGE || null,
  },
];

module.exports = {
  newCelebrityJudges,
  judgePersonalityPrompts,
  judgeAvatarDescriptions,
};
