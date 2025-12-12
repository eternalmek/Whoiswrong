import { API_BASE_URL } from '../config/env';

export interface VerdictPayload {
  context?: string;
  optionA: string;
  optionB: string;
  judgeId?: string;
  makePublic?: boolean;
  isAnonymous?: boolean;
  category?: string | null;
  allowIndexing?: boolean;
}

export interface VerdictResult {
  winner: string;
  loser: string;
  reasoning: string;
  roast?: string;
}

interface VerdictApiResponse {
  ok?: boolean;
  judgement?: {
    wrong: string;
    right: string;
    reason: string;
    roast?: string;
  };
  error?: string;
}

export async function submitVerdict(payload: VerdictPayload): Promise<VerdictResult> {
  const body = {
    context: payload.context || '',
    optionA: payload.optionA,
    optionB: payload.optionB,
    judgeId: payload.judgeId,
    makePublic: payload.makePublic ?? true,
    isAnonymous: payload.isAnonymous ?? false,
    category: payload.category ?? null,
    allowIndexing: payload.allowIndexing ?? true,
  };

  const response = await fetch(`${API_BASE_URL}/api/judge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const fallback = await response.text().catch(() => '');
    throw new Error(`Unable to submit verdict (${response.status}). ${fallback}`.trim());
  }

  const data: VerdictApiResponse = await response.json();

  if (!data?.ok || !data.judgement) {
    const message = data?.error || 'Unexpected response from verdict endpoint.';
    throw new Error(message);
  }

  const reasoningParts = [data.judgement.reason, data.judgement.roast]
    .filter((value) => !!value)
    .join('\n\n')
    .trim();

  return {
    winner: data.judgement.right,
    loser: data.judgement.wrong,
    reasoning: reasoningParts,
    roast: data.judgement.roast,
  };
}
