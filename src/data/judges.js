const baseAvatar = (name, tone = 'f4c2c2') =>
  `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&radius=50&backgroundColor=f8fafc&skinColor=${tone}`;

const celebrityJudges = [
  {
    id: 'normal',
    slug: 'normal',
    name: 'AI Judge',
    category: 'Core',
    description: 'Balanced, decisive, and straight to the point.',
    is_celebrity: false,
    is_default_free: true,
    is_active: true,
    photo_url: null,
    avatar_placeholder: baseAvatar('AI Judge', 'ffd5dc'),
    personality_prompt:
      'Act like a confident, witty host of a viral courtroom show. Make decisive calls with short, punchy explanations. Never hedge.',
  },
];

module.exports = { celebrityJudges };
