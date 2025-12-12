export interface Judge {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  personality_prompt?: string;
  photo_url?: string;
  avatar_url?: string;
  image_url?: string;
  is_free?: boolean;
  is_default_free?: boolean;
  price?: number;
  is_active?: boolean;
  emoji?: string;
}

export interface Debate {
  id: string;
  user_id?: string;
  context?: string;
  option_a: string;
  option_b: string;
  wrong_side: string;
  right_side: string;
  verdict_text: string;
  category?: string;
  is_public: boolean;
  is_anonymous: boolean;
  judge_id?: string;
  judge_name?: string;
  judge_slug?: string;
  judge_style?: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface VerdictRequest {
  context?: string;
  optionA: string;
  optionB: string;
  judgeId?: string;
}

export interface VerdictResult {
  winner: string;
  loser: string;
  reasoning: string;
  debateId?: string;
}

export interface Comment {
  id: string;
  debate_id: string;
  user_id?: string;
  content: string;
  created_at: string;
}

export interface Vote {
  id: string;
  debate_id: string;
  voter_fingerprint: string;
  vote_value: number;
  created_at: string;
}
