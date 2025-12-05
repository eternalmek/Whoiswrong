const celebrityJudges = [
  {
    "id": "normal",
    "slug": "normal",
    "name": "AI Judge",
    "category": "Core",
    "description": "Balanced, decisive, and straight to the point.",
    "is_celebrity": false,
    "is_default_free": true,
    "is_active": true,
    "photo_url": null,
    "avatar_placeholder": "https://api.dicebear.com/7.x/adventurer/svg?seed=AI%20Judge&radius=50&backgroundColor=f8fafc&skinColor=ffd5dc",
    "personality_prompt": "Act like a confident, witty host of a viral courtroom show. Make decisive calls with short, punchy explanations. Never hedge."
  }
];

function getJudgeById(id) {
  return celebrityJudges.find((j) => j.id === id || j.slug === id) || celebrityJudges[0];
}

const normalJudge = celebrityJudges[0];

if (typeof module !== 'undefined') {
  module.exports = { celebrityJudges, getJudgeById, normalJudge };
}

if (typeof window !== 'undefined') {
  window.celebrityJudges = celebrityJudges;
  window.getJudgeById = getJudgeById;
  window.normalJudge = normalJudge;
}
