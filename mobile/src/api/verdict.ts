import type { VerdictRequest, VerdictResult } from '../types';

const API_BASE_URL = 'https://www.whoiswrong.io';

/**
 * Submit a verdict request to the backend
 */
export async function submitVerdict(request: VerdictRequest): Promise<VerdictResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context: request.context || '',
        optionA: request.optionA,
        optionB: request.optionB,
        judgeId: request.judgeId || 'ai_judge',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      winner: data.winner || data.rightSide || request.optionA,
      loser: data.loser || data.wrongSide || request.optionB,
      reasoning: data.reasoning || data.verdict || data.verdictText || 'No reasoning provided.',
      debateId: data.debateId || data.id,
    };
  } catch (error: any) {
    console.error('Error submitting verdict:', error);
    throw new Error(error.message || 'Failed to get verdict. Please try again.');
  }
}
