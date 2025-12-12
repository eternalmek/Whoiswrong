import { API_BASE_URL } from '../config/env';

export interface Judge {
  id?: string;
  slug?: string;
  name: string;
  description?: string;
  category?: string;
  is_free?: boolean;
  is_default_free?: boolean;
  price?: number;
  avatar_url?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
  personality_prompt?: string;
}

interface JudgesResponse {
  ok?: boolean;
  judges?: Judge[];
  error?: string;
}

export async function fetchJudges(): Promise<Judge[]> {
  const response = await fetch(`${API_BASE_URL}/api/judges`);

  if (!response.ok) {
    const fallback = await response.text().catch(() => '');
    throw new Error(`Unable to fetch judges (${response.status}). ${fallback}`.trim());
  }

  const data: JudgesResponse = await response.json();

  if (!data?.ok || !Array.isArray(data.judges)) {
    const message = data?.error || 'Unexpected response when loading judges.';
    throw new Error(message);
  }

  return data.judges;
}
